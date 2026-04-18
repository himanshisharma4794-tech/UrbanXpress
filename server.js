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
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Data directory and files
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

// In-memory storage fallback for read-only environments (like Vercel)
let usersCache = [];
let bookingsCache = [];
let isFileSystemWritable = true;

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        console.warn('Warning: Data directory not writable, using in-memory storage fallback.');
        isFileSystemWritable = false;
    }
}

// Initialize data files
async function initDataFiles() {
    await ensureDataDir();

    // Initialize users
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        usersCache = JSON.parse(data);
    } catch {
        usersCache = [];
        if (isFileSystemWritable) {
            try {
                await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
            } catch (err) {
                isFileSystemWritable = false;
            }
        }
    }

    // Initialize bookings
    try {
        const data = await fs.readFile(BOOKINGS_FILE, 'utf8');
        bookingsCache = JSON.parse(data);
    } catch {
        bookingsCache = [];
        if (isFileSystemWritable) {
            try {
                await fs.writeFile(BOOKINGS_FILE, JSON.stringify([], null, 2));
            } catch (err) {
                isFileSystemWritable = false;
            }
        }
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

// Get all users
async function getUsers() {
    if (!isFileSystemWritable) return usersCache;
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        usersCache = JSON.parse(data);
        return usersCache;
    } catch {
        return usersCache;
    }
}

// Save users
async function saveUsers(users) {
    usersCache = users;
    if (!isFileSystemWritable) return;
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error saving users to file:', err);
        isFileSystemWritable = false;
    }
}

// Get all bookings
async function getBookings() {
    if (!isFileSystemWritable) return bookingsCache;
    try {
        const data = await fs.readFile(BOOKINGS_FILE, 'utf8');
        bookingsCache = JSON.parse(data);
        return bookingsCache;
    } catch {
        return bookingsCache;
    }
}

// Save bookings
async function saveBookings(bookings) {
    bookingsCache = bookings;
    if (!isFileSystemWritable) return;
    try {
        await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
    } catch (err) {
        console.error('Error saving bookings to file:', err);
        isFileSystemWritable = false;
    }
}

// ================= AUTHENTICATION ROUTES =================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        const users = await getUsers();

        // Check if email already exists
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered. Please log in.'
            });
        }

        // Create new user
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

        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const users = await getUsers();
        const hashedPassword = hashPassword(password);

        const user = users.find(u =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.password === hashedPassword
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        await saveUsers(users);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            user: userWithoutPassword,
            rememberMe: rememberMe || false
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Get current user by ID
app.get('/api/auth/user/:id', async (req, res) => {
    try {
        const users = await getUsers();
        const user = users.find(u => u.id === req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({
            success: true,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ================= BOOKING ROUTES =================

// Create new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, userEmail, serviceType, from, to, date, time, passengers, amount, notes } = req.body;

        if (!serviceType || !from || !to || !date) {
            return res.status(400).json({
                success: false,
                message: 'Service type, from, to, and date are required'
            });
        }

        const bookings = await getBookings();

        const newBooking = {
            id: generateId(),
            userId: userId || null,
            userEmail: userEmail || null,
            serviceType,
            from,
            to,
            date,
            time: time || '',
            passengers: passengers || 1,
            amount: amount || 0,
            notes: notes || '',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        bookings.push(newBooking);
        await saveBookings(bookings);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking: newBooking
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating booking'
        });
    }
});

// Get all bookings for a user
app.get('/api/bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await getBookings();

        // Get user's bookings, sorted by date (newest first)
        const userBookings = bookings
            .filter(b => b.userId === userId || b.userEmail === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            bookings: userBookings
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching bookings'
        });
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

        res.json({
            success: true,
            bookings: recentBookings
        });
    } catch (error) {
        console.error('Get recent bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching recent bookings'
        });
    }
});

// Cancel a booking
app.patch('/api/bookings/:bookingId/cancel', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const bookings = await getBookings();

        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        booking.status = 'cancelled';
        booking.cancelledAt = new Date().toISOString();

        await saveBookings(bookings);

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error cancelling booking'
        });
    }
});

// Get all users (for admin/debug purposes)
app.get('/api/users', async (req, res) => {
    try {
        const users = await getUsers();
        const usersWithoutPasswords = users.map(u => {
            const { password: _, ...userWithoutPassword } = u;
            return userWithoutPassword;
        });

        res.json({
            success: true,
            count: users.length,
            users: usersWithoutPasswords
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'UrbanXpress Local Server'
    });
});

// Start server
async function startServer() {
    await initDataFiles();

    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log('  UrbanXpress Local Server');
        console.log('='.repeat(50));
        console.log(`  Server running at: http://localhost:${PORT}`);
        console.log(`  Login page: http://localhost:${PORT}/loginpage.html`);
        console.log(`  Dashboard: http://localhost:${PORT}/dashboard.html`);
        console.log(`  API Health: http://localhost:${PORT}/api/health`);
        console.log('='.repeat(50));
        console.log('  Press Ctrl+C to stop the server');
        console.log('='.repeat(50));
    });
}

// Export for Vercel
module.exports = app;

// Run initialization
initDataFiles().catch(err => console.error('Error during data initialization:', err));

// Start server if run directly
if (require.main === module) {
    startServer().catch(console.error);
}