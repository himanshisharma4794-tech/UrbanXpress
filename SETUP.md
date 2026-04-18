# UrbanXpress - Setup Guide

## Project Overview
UrbanXpress is a transportation booking platform with:
- User authentication (Login/Sign Up)
- Booking management system
- Local server for data storage

## Quick Start

### 1. Install Dependencies
Open a terminal in the project folder and run:
```bash
npm install
```

### 2. Start the Local Server
```bash
npm start
```

The server will start at `http://localhost:3000`

### 3. Access the Application
Open your browser and go to:
- **Login Page**: http://localhost:3000/loginpage.html
- **Dashboard**: http://localhost:3000/dashboard.html
- **Recent Bookings**: http://localhost:3000/recent-bookings.html

## Features

### Authentication
- User registration with email validation
- Secure password storage (SHA-256 hashing)
- Session management
- "Remember me" functionality

### Bookings
- Create new bookings (rides, shipments, moves, rentals)
- View booking history
- Filter bookings by service type, status, and date
- Cancel active bookings

### Data Storage
All data is stored locally in JSON files:
- `data/users.json` - User accounts
- `data/bookings.json` - Booking records

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/user/:id` - Get user by ID

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:userId` - Get all user bookings
- `GET /api/bookings/:userId/recent` - Get last 10 bookings
- `PATCH /api/bookings/:id/cancel` - Cancel a booking

### System
- `GET /api/health` - Server health check
- `GET /api/users` - List all users (debug)

## File Structure
```
/
├── server.js              # Express server
├── package.json           # Dependencies
├── loginpage.html         # Login/Sign Up page
├── dashboard.html         # User dashboard
├── recent-bookings.html   # Booking history
├── data/                  # Data storage folder
│   ├── users.json
│   └── bookings.json
└── SETUP.md              # This file
```

## Troubleshooting

### Server won't start
- Make sure port 3000 is not in use
- Check if Node.js is installed: `node --version`

### Cannot connect to server
- Ensure the server is running (`npm start`)
- Check that you're accessing via `http://localhost:3000`
- Clear browser cache and try again

### Data not saving
- Check that the `data/` folder exists
- Ensure the server has write permissions

## Development Mode

If the server is not running, the app will fall back to localStorage for:
- User authentication (stored in browser)
- Booking data (stored locally)

Note: Data won't be shared between devices/browsers in fallback mode.
