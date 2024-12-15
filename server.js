const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a secure key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 3600000 } // 1-hour session expiry
}));

// Serve Login Page
app.get('/', (req, res) => {
    if (req.session.username) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve Dashboard Page
app.get('/dashboard', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Handle Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const usersPath = path.join(__dirname, 'data', 'users.json');
    if (!fs.existsSync(usersPath)) {
        return res.status(400).send({ status: 'error', message: 'No users found!' });
    }

    const usersData = fs.readFileSync(usersPath);
    const users = JSON.parse(usersData);

    const user = users.find(user => user.username === username);

    if (!user) {
        return res.status(404).send({ status: 'user_not_found' });
    }

    if (user.password !== password) {
        return res.status(401).send({ status: 'wrong_password' });
    }

    // Set session data
    req.session.username = username;

    res.status(200).send({ status: 'success', redirect: '/dashboard' });
});

// Handle Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
