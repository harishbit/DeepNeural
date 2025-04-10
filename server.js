require('dotenv').config();
const express = require('express');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;

const mongoose = require('mongoose');
const session = require('express-session');
const cors = require("cors");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const Chat = require('./src/models/Chat');
const User = require('./src/models/User');
const scriptController = require('./src/controllers/scriptController');
const connectDB = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware setup
app.use(cors({
    origin: `http://localhost:${process.env.PORT}`,
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        sameSite: 'lax'
    },
    name: 'aichat.sid'
}));

// -----------------------------
// Helper Functions & Variables
// -----------------------------

// Temporary in-memory store for verification codes.
// In production consider using a persistent store.
const verificationCodes = new Map();

// A helper function for sending emails with verification codes
const sendVerificationEmail = async (email, verificationCode, subject, htmlContent) => {
    const mailOptions = {
        from: `"DeepNeural" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: htmlContent.replace('{{code}}', verificationCode)
    };
    await transporter.sendMail(mailOptions);
};

// Create a transporter for nodemailer using secure SMTP settings
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Email configuration error:', error);
        console.error('Check your .env file settings for EMAIL_USER and EMAIL_PASS, and verify your Gmail account configuration.');
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generate a random 6-digit code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
}

// -----------------------------
// Authentication Endpoints
// -----------------------------

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        console.log('Signup attempt for:', email);

        if (!username || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ message: 'All fields are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log('User already exists:', existingUser.email);
            return res.status(400).json({ message: existingUser.email === email ? 'Email already registered' : 'Username already taken' });
        }

        const user = new User({ username, email, password });
        await user.save();
        console.log('User created successfully:', email);
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);

        if (!email || !password) {
            console.log('Missing login credentials');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        req.session.userId = user._id;
        console.log('Login successful for:', email);
        res.json({
            message: 'Login successful',
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    console.log('Logout request received');
    try {
        if (req.session) {
            req.session.destroy();
        }
        res.clearCookie('aichat.sid');
        res.clearCookie('connect.sid');
        console.log('Logout successful');
        res.status(200).send({ success: true });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(200).send({ success: true, error: err.message });
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoints to serve login, signup, and settings pages
app.get(['/login.html', '/signup.html'], (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', req.path));
});
app.get('/settings.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/', (req, res) => {
    if (!req.session || !req.session.userId) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route to redirect non-API/static routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.includes('.') || req.path.startsWith('/assets/') || req.path.startsWith('/js/')) {
        return next();
    }
    if (!req.session || !req.session.userId) return res.redirect('/login.html');
    next();
});

// -----------------------------
// Email Verification Endpoints
// -----------------------------

app.post('/api/auth/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Sending verification code to:', email);
        const verificationCode = generateVerificationCode();
        verificationCodes.set(email, { code: verificationCode, timestamp: Date.now() });

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Your Verification Code</h2>
                <p>Use the following code to complete your login:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #4CAF50; font-size: 32px;">{{code}}</h1>
                </div>
                <p style="color: #666;">This code will expire in 10 minutes.</p>
                <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
        `;
        await sendVerificationEmail(email, verificationCode, 'Login Verification Code', html);
        console.log('Verification code sent successfully');
        res.json({ success: true, message: 'Verification code sent successfully' });
    } catch (error) {
        console.error('Error sending verification code:', error);
        res.status(500).json({ success: false, message: 'Failed to send verification code', error: error.message });
    }
});

app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const verificationCode = generateVerificationCode();
        verificationCodes.set(email, { code: verificationCode, timestamp: Date.now() });

        const html = `
            <h2>Your New Verification Code</h2>
            <p>Use the following code to complete your login:</p>
            <h1 style="color: #4CAF50; font-size: 32px;">{{code}}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        `;
        await sendVerificationEmail(email, verificationCode, 'New Login Verification Code', html);
        res.json({ success: true, message: 'New verification code sent successfully' });
    } catch (error) {
        console.error('Error resending verification code:', error);
        res.status(500).json({ success: false, message: 'Failed to resend verification code' });
    }
});

app.post('/api/auth/verify-and-login', (req, res) => {
    const { email, code } = req.body;
    const storedData = verificationCodes.get(email);
    if (!storedData) return res.status(400).json({ success: false, message: 'No verification code found' });
    if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
        verificationCodes.delete(email);
        return res.status(400).json({ success: false, message: 'Verification code expired' });
    }
    if (storedData.code !== code) {
        return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    verificationCodes.delete(email);
    // In production create/send a session token here.
    res.json({ success: true, message: 'Login successful' });
});

// -----------------------------
// Two-Factor Authentication Endpoints
// -----------------------------

app.post('/api/2fa/setup', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const secret = speakeasy.generateSecret({ name: `AI Chat Interface (${user.email})` });
        user.tempTwoFactorSecret = secret.base32;
        await user.save();

        QRCode.toDataURL(secret.otpauth_url, (err, qrCodeUrl) => {
            if (err) {
                console.error('Error generating QR code:', err);
                return res.status(500).json({ message: 'Error generating QR code' });
            }
            res.json({ secret: secret.base32, qrCode: qrCodeUrl });
        });
    } catch (error) {
        console.error('Error generating 2FA:', error);
        res.status(500).json({ message: 'Error generating 2FA setup' });
    }
});

app.post('/api/auth/verify-2fa', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(401).json({ message: 'Authentication required' });
        if (!user.tempTwoFactorSecret) return res.status(400).json({ message: 'No 2FA setup in progress' });
        
        const verified = speakeasy.totp.verify({
            secret: user.tempTwoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });
        if (verified) {
            user.twoFactorSecret = user.tempTwoFactorSecret;
            user.twoFactorEnabled = true;
            user.tempTwoFactorSecret = undefined;
            await user.save();
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('Error verifying 2FA:', error);
        res.status(500).json({ message: 'Error verifying 2FA code' });
    }
});

app.post('/api/auth/disable-2fa', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.session.userId);
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });
        if (verified) {
            user.twoFactorSecret = undefined;
            user.twoFactorEnabled = false;
            await user.save();
            res.json({ message: '2FA disabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ message: 'Error disabling 2FA' });
    }
});

// -----------------------------
// Chat Routes (Consolidated)
// -----------------------------

// Get all chats for the authenticated user
app.get('/api/chats', requireAuth, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.session.userId })
            .sort({ updatedAt: -1 });
        res.json({ chats });
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get a specific chat by ID
app.get('/api/chats/:chatId', requireAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: 'Invalid chat ID' });
        }
        const chat = await Chat.findOne({ _id: chatId, userId: req.session.userId });
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        res.json({ chat });
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

// Create a new chat
app.post('/api/chats', requireAuth, async (req, res) => {
    try {
        const { messages, title } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: 'Valid messages are required' });
        }
        const chatTitle = title || (messages[0].content.substring(0, 50) + (messages[0].content.length > 50 ? '...' : ''));
        const chat = new Chat({
            userId: req.session.userId,
            messages,
            title: chatTitle
        });
        await chat.save();
        res.status(201).json(chat);
    } catch (error) {
        console.error('Error saving chat:', error);
        res.status(500).json({ message: 'Error saving chat' });
    }
});

// Delete a specific chat
app.delete('/api/chats/:chatId', requireAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: 'Invalid chat ID' });
        }
        const result = await Chat.findOneAndDelete({ _id: chatId, userId: req.session.userId });
        if (!result) {
            return res.status(404).json({ message: 'Chat not found or already deleted' });
        }
        res.json({ message: 'Chat deleted successfully', deletedChat: result });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ message: 'Error deleting chat' });
    }
});

// Delete all chats for the authenticated user
app.delete('/api/chats', requireAuth, async (req, res) => {
    try {
        const result = await Chat.deleteMany({ userId: req.session.userId });
        res.json({ message: 'All chats deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error deleting chats:', error);
        res.status(500).json({ error: 'Failed to delete chats' });
    }
});

// -----------------------------
// Settings Endpoints
// -----------------------------

app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

app.put('/api/settings', requireAuth, async (req, res) => {
    try {
        const { username, email, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.session.userId);
        if (username) user.username = username;
        if (email) user.email = email;
        if (newPassword) {
            if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
            const isValid = await user.comparePassword(currentPassword);
            if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });
            user.password = newPassword;
        }
        await user.save();
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// -----------------------------
// Script Execution Endpoint
// -----------------------------

app.post('/run-script', requireAuth, scriptController.runScript);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
