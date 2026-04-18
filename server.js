/**
 * UrbanXpress Local Server
 * Express server with JSON file storage for users and bookings
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Export for Vercel (Must be before any potential sync errors)
module.exports = app;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Data directory and files
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

// In-memory storage fallback for read-only environments (like Vercel)
let usersCache = null;
let bookingsCache = null;
let isFileSystemWritable = !process.env.VERCEL;

// Initialize data files
async function initData() {
    if (usersCache !== null && bookingsCache !== null) return;

    // Initialize users
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        usersCache = JSON.parse(data);
    } catch (err) {
        console.log('Using empty users list');
        usersCache = [];
    }

    // Initialize bookings
    try {
        const data = await fs.readFile(BOOKINGS_FILE, 'utf8');
        bookingsCache = JSON.parse(data);
    } catch (err) {
        console.log('Using empty bookings list');
        bookingsCache = [];
    }
}

// Get all users
async function getUsers() {
    await initData();
    return usersCache;
}

// Save users
async function saveUsers(users) {
    usersCache = users;
    if (!isFileSystemWritable) return;
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.warn('File system not writable, keeping changes in memory only.');
        isFileSystemWritable = false;
    }
}

// Get all bookings
async function getBookings() {
    await initData();
    return bookingsCache;
}

// Save bookings
async function saveBookings(bookings) {
    bookingsCache = bookings;
    if (!isFileSystemWritable) return;
    try {
        await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
    } catch (err) {
        console.warn('File system not writable, keeping changes in memory only.');
        isFileSystemWritable = false;
    }
}

// Hash password using SHA-256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate unique ID
function generateId() {
    return crypto.randomUUID();
}

// ================= AUTHENTICATION ROUTES =================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }
        const users = await getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }
        const newUser = {
            id: generateId(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        users.push(newUser);
        await saveUsers(users);
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const users = await getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === hashPassword(password));
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        user.lastLogin = new Date().toISOString();
        await saveUsers(users);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword, rememberMe: !!rememberMe });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get current user by ID
app.get('/api/auth/user/:id', async (req, res) => {
    try {
        const users = await getUsers();
        const user = users.find(u => u.id === req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ================= BOOKING ROUTES =================

// Create new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, userEmail, serviceType, from, to, date, time, passengers, amount, notes } = req.body;
        if (!serviceType || !from || !to || !date) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const bookings = await getBookings();
        const newBooking = {
            id: generateId(),
            userId: userId || null,
            userEmail: userEmail || null,
            serviceType, from, to, date,
            time: time || '',
            passengers: passengers || 1,
            amount: amount || 0,
            notes: notes || '',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        bookings.push(newBooking);
        await saveBookings(bookings);
        res.status(201).json({ success: true, booking: newBooking });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all bookings for a user
app.get('/api/bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await getBookings();
        const userBookings = bookings
            .filter(b => b.userId === userId || b.userEmail === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, bookings: userBookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get recent bookings (last 10)
app.get('/api/bookings/:userId/recent', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await getBookings();
        const recentBookings = bookings
            .filter(b => b.userId === userId || b.userEmail === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
        res.json({ success: true, bookings: recentBookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Cancel a booking
app.patch('/api/bookings/:bookingId/cancel', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const bookings = await getBookings();
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        booking.status = 'cancelled';
        booking.cancelledAt = new Date().toISOString();
        await saveBookings(bookings);
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'UrbanXpress Server' });
});

// Start server if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
