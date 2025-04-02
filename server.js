require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const mongoose = require('mongoose');
const session = require('express-session');
const cors = require("cors");
const Chat = require('./models/Chat');
const User = require('./models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://adarshmishr6:Adarshss12%23@cluster0.hngx2rn.mongodb.net/chat_boat', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority'
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.json());
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

app.post("/run-script", (req, res) => {
    const { prompt } = req.body;

    console.log("Received prompt:", prompt);

    if (!prompt) {
        return res.status(400).json({
            response: "I didn't receive any message. Please try again.",
            error: "Missing prompt"
        });
    }

    // Correctly locate the Python script - use the direct file path
    const scriptPath = path.resolve(__dirname, "inf.py");
    console.log("Using Python script at:", scriptPath);

    // Use explicit Python executable path for Windows
    const pythonProcess = spawn("python", [scriptPath]);

    // Send prompt to Python script via stdin with proper encoding
    pythonProcess.stdin.write(JSON.stringify({ prompt }));
    pythonProcess.stdin.end();

    let output = "";
    let errorOutput = "";

    // Set timeout for the Python process
    const timeout = setTimeout(() => {
        console.log("Python process timed out after 30 seconds");
        pythonProcess.kill();
        return res.status(504).json({
            response: "I'm sorry, the request timed out. Please try again with a shorter message.",
            error: "Request timed out"
        });
    }, 30000);

    // Capture Python output
    pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
        console.log("Python output chunk received:", data.toString().substring(0, 100) + "...");
    });

    pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error("Python error:", data.toString());
    });

    pythonProcess.on("close", (code) => {
        // Clear the timeout since the process completed
        clearTimeout(timeout);

        console.log(`Python process exited with code ${code}`);
        console.log("Full output:", output);

        if (code !== 0) {
            console.error("Python script error. Exit code:", code);
            console.error("Error output:", errorOutput);

            return res.json({
                response: "I'm sorry, I encountered an erroronly sever haaa processing your request. Please try again with a different query.",
                error: errorOutput || "Unknown error",
                code: code
            });
        }

        try {
            const result = JSON.parse(output);
            res.json(result); 
        } catch (error) {
            console.error("Error parsing Python output:", error);
            console.error("Raw output:", output);

            // Send a default response rather than an error status
            res.json({
                response: "I'm sorry, I couldn't generate a proper response. Please try again with a different question.",
                error: "Failed to parse Python output"
            });
        }
    });

    pythonProcess.on("error", (error) => {
        // Clear the timeout since the process failed to start
        clearTimeout(timeout);

        console.error(`Failed to start Python script: ${error.message}`);

        res.json({
            response: "I'm sorry, there was a technical issue. Please try again later.",
            error: "Failed to execute Python script: " + error.message
        });
    });
});

// app.get("/run-script", (req, res) => {
//     exec("python process_data.py", (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Execution error: ${error.message}`);
//         return res.status(500).json({ error: "Failed to run Python script" });
//       }

//       if (stderr) {
//         console.error(`Python error: ${stderr}`);
//         return res.status(500).json({ error: "Python script error", details: stderr });
//       }

//       try {
//         const result = JSON.parse(stdout);
//         return res.json(result);
//       } catch (parseError) {
//         console.error(`Parsing error: ${parseError.message}`);
//         return res.status(500).json({ error: "Error parsing script output", details: stdout });
//       }
//     });
//   });



// Store verification codes temporarily (in production, use a database)
const verificationCodes = new Map();

// Email configuration using secure SMTP settings
console.log('Email configuration:', {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? 'Password is set' : 'Password is not set'
});

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

// Verify email configuration with better error handling
transporter.verify(function (error, success) {
    if (error) {
        console.error('Email configuration error:', error);
        console.error('Please check your .env file and ensure:');
        console.error('1. EMAIL_USER is set to your Gmail address');
        console.error('2. EMAIL_PASS is set to your Gmail App Password (16 characters, no spaces)');
        console.error('3. 2-Step Verification is enabled on your Google Account');
        console.error('4. The App Password was generated for the correct app (Mail)');
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generate a random 6-digit code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
}

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        console.log('Signup attempt for:', email);

        // Validate required fields
        if (!username || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log('User already exists:', existingUser.email);
            if (existingUser.email === email) {
                return res.status(400).json({ message: 'Email already registered' });
            }
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Create new user
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

        // Validate required fields
        if (!email || !password) {
            console.log('Missing login credentials');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Set session
        req.session.userId = user._id;
        console.log('Login successful for:', email);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Simplified logout endpoint
app.post('/api/auth/logout', (req, res) => {
    console.log('Logout request received');

    try {
        // Clear all session data
        if (req.session) {
            req.session.destroy();
        }

        // Clear cookies
        res.clearCookie('aichat.sid');
        res.clearCookie('connect.sid');

        console.log('Logout successful');
        res.status(200).send({ success: true });
    } catch (err) {
        console.error('Logout error:', err);
        // Still return success so client continues with redirect
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

// Add explicit routes for login and signup pages - BEFORE catch-all route
app.get('/login.html', (req, res) => {
    console.log('Login page requested');
    if (req.session && req.session.userId) {
        // If already logged in, redirect to home
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup.html', (req, res) => {
    console.log('Signup page requested');
    if (req.session && req.session.userId) {
        // If already logged in, redirect to home
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/settings.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Protected root route
app.get('/', (req, res) => {
    console.log('Root route accessed, session:', req.session?.userId ? 'active' : 'none');
    if (!req.session || !req.session.userId) {
        console.log('No active session, redirecting to login');
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Move this catch-all route AFTER the specific routes
app.get('*', (req, res, next) => {
    // Skip API routes and static files
    if (req.path.startsWith('/api/') ||
        req.path.includes('.') ||
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/js/')) {
        return next();
    }

    console.log('Catch-all route accessed for:', req.path);
    if (!req.session || !req.session.userId) {
        console.log('Redirecting to login from catch-all route');
        return res.redirect('/login.html');
    }
    next();
});

// Get chat history
app.get('/api/history', requireAuth, async (req, res) => {
    try {
        const history = await Chat.find({ userId: req.session.userId }).sort({ timestamp: -1 }).limit(50);
        res.json(history);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching chat history'
        });
    }
});

// API endpoint to handle data
app.post('/api/data', requireAuth, async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log('Received message:', userMessage);

        // Read the test.json file
        const jsonData = await fs.readFile(path.join(__dirname, 'public', 'assets', 'test.json'), 'utf8');
        const data = JSON.parse(jsonData);

        // Create a response using the JSON data
        const response = {
            status: 'success',
            message: JSON.stringify(data, null, 2),
            data: data
        };

        // Save the chat to MongoDB with user ID
        const chat = new Chat({
            userId: req.session.userId,
            userMessage: userMessage,
            aiResponse: data.output
        });
        await chat.save();

        res.json(response);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// Delete chat history
app.delete('/api/history', requireAuth, async (req, res) => {
    try {
        await Chat.deleteMany({ userId: req.session.userId });
        res.json({ status: 'success', message: 'Chat history cleared' });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error clearing chat history'
        });
    }
});

// Delete individual chat
app.delete('/api/history/:id', requireAuth, async (req, res) => {
    try {
        const chatId = req.params.id;

        // Check if ID is valid
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid chat ID'
            });
        }

        const result = await Chat.findOneAndDelete({ _id: chatId, userId: req.session.userId });

        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'Chat not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Chat deleted successfully',
            deletedId: chatId
        });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error deleting chat'
        });
    }
});

// Send verification code endpoint
app.post('/api/auth/send-verification', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Sending verification code to:', email); // Debug log

        // Generate a new verification code
        const verificationCode = generateVerificationCode();

        // Store the code
        verificationCodes.set(email, {
            code: verificationCode,
            timestamp: Date.now()
        });

        // Email content
        const mailOptions = {
            from: '"DeepNeural" <abuharish186@gmail.com>',
            to: email,
            subject: 'Login Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Your Verification Code</h2>
                    <p>Use the following code to complete your login:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${verificationCode}</h1>
                    </div>
                    <p style="color: #666;">This code will expire in 10 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                </div>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Verification code sent successfully'); // Debug log

        res.json({ success: true, message: 'Verification code sent successfully' });
    } catch (error) {
        console.error('Error sending verification code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send verification code',
            error: error.message // Include error message for debugging
        });
    }
});

// Verify code and login endpoint
app.post('/api/auth/verify-and-login', (req, res) => {
    const { email, code } = req.body;
    console.log('Verifying code for:', email); // Debug log

    const storedData = verificationCodes.get(email);

    if (!storedData) {
        return res.status(400).json({ success: false, message: 'No verification code found' });
    }

    // Check if code is expired (10 minutes)
    if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
        verificationCodes.delete(email);
        return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    if (storedData.code !== code) {
        return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Clear the used verification code
    verificationCodes.delete(email);

    // In production, create and send a session token here
    res.json({ success: true, message: 'Login successful' });
});

// Resend verification code endpoint
app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;

        // Generate a new verification code
        const verificationCode = generateVerificationCode();

        // Store the new code
        verificationCodes.set(email, {
            code: verificationCode,
            timestamp: Date.now()
        });

        // Email content
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'New Login Verification Code',
            html: `
                <h2>Your New Verification Code</h2>
                <p>Use the following code to complete your login:</p>
                <h1 style="color: #4CAF50; font-size: 32px;">${verificationCode}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'New verification code sent successfully' });
    } catch (error) {
        console.error('Error resending verification code:', error);
        res.status(500).json({ success: false, message: 'Failed to resend verification code' });
    }
});

// 2FA setup endpoint with authentication check
app.post('/api/2fa/setup', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `AI Chat Interface (${user.email})`
        });
        console.log('Generated secret:', secret); // Log the secret for debugging

        // Store the secret temporarily
        user.tempTwoFactorSecret = secret.base32;
        await user.save();

        // Generate QR code
        QRCode.toDataURL(secret.otpauth_url, (err, qrCodeUrl) => {
            if (err) {
                console.error('Error generating QR code:', err);
                return res.status(500).json({ message: 'Error generating QR code' });
            }

            res.json({
                secret: secret.base32,
                qrCode: qrCodeUrl
            });
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

        if (!user) {
            console.error('User not found for session:', req.session.userId);
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!user.tempTwoFactorSecret) {
            console.error('No 2FA setup in progress for user:', user._id);
            return res.status(400).json({ message: 'No 2FA setup in progress' });
        }

        console.log('Verifying token for user:', user._id);
        
        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.tempTwoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 30 seconds of clock drift
        });

        console.log('Token verification result:', verified);

        if (verified) {
            // Enable 2FA and save the secret
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

        // Verify the token one last time
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            // Disable 2FA
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

// Chat History Routes
app.get('/api/chats/history', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const chats = await Chat.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(20);

        res.json(chats);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ message: 'Error fetching chat history' });
    }
});

app.get('/api/chats/:chatId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const chatId = req.params.chatId;

        // Validate chat ID format
        if (!chatId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid chat ID format' });
        }

        const chat = await Chat.findOne({
            _id: chatId,
            userId: userId
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.json(chat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ message: 'Error fetching chat' });
    }
});

app.post('/api/chats', requireAuth, async (req, res) => {
    try {
        const { messages, title } = req.body;
        const userId = req.session.userId;

        // Validate required fields
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: 'Valid messages are required' });
        }

        // Create chat with generated title if not provided
        const chatTitle = title || messages[0].content.substring(0, 50) + (messages[0].content.length > 50 ? '...' : '');

        const chat = new Chat({
            userId,
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

// Delete chat
app.delete('/api/chats/:chatId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const chatId = req.params.chatId;

        // Validate chat ID format
        if (!chatId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid chat ID format' });
        }

        const result = await Chat.findOneAndDelete({
            _id: chatId,
            userId: userId
        });

        if (!result) {
            return res.status(404).json({ message: 'Chat not found or already deleted' });
        }

        res.json({ message: 'Chat deleted successfully', deletedChat: result });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ message: 'Error deleting chat' });
    }
});

// Delete all chats for a user
app.delete('/api/chats', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Safety check to ensure user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete all chats for this user
        const result = await Chat.deleteMany({ userId });

        res.json({
            message: 'All chats deleted successfully',
            count: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ message: 'Error clearing chat history' });
    }
});

// Settings Routes
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
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required' });
            }
            const isValid = await user.comparePassword(currentPassword);
            if (!isValid) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
            user.password = newPassword;
        }

        await user.save();
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Get all chats for a user
app.get('/api/chats', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const chats = await Chat.find({ userId: req.session.userId }).sort({ updatedAt: -1 });
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

        // Validate chat ID
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: 'Invalid chat ID' });
        }

        // Find chat by ID and ensure it belongs to the current user
        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.session.userId
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({ chat });
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

// Delete all chats for a user
app.delete('/api/chats', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete all chats for the user
        const result = await Chat.deleteMany({ userId: req.session.userId });
        res.json({
            message: 'All chats deleted successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting chats:', error);
        res.status(500).json({ error: 'Failed to delete chats' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Open your browser and navigate to http://localhost:${PORT}`);
}); 