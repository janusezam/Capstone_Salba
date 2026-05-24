const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const buildResetCode = () => String(Math.floor(100000 + Math.random() * 900000));

const isSmtpConfigured = () => {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
};

const getMailer = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: Number(process.env.MAIL_PORT || 587) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

/* ==============================
   GET ALL USERS (ADMIN ONLY)
  ============================== */
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------
   REGISTER
--------------------------------*/
router.post('/register', async (req, res) => {
  try {
    const { name, email, username, password, role, termsAccepted, termsVersion, termsAcceptedAt } = req.body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    const normalizedUsername = username ? String(username).trim() : '';
    const acceptedVersion = termsVersion || '2026-04-09';

    // Rescuers use username, others use email
    if (role === 'rescuer') {
      if (!name || !normalizedEmail || !normalizedUsername || !password)
        return res.status(400).json({ message: 'Name, email, username and password required' });

      const existingUsername = await User.findOne({ username: normalizedUsername });
      if (existingUsername)
        return res.status(400).json({ message: 'Username already taken' });

      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail)
        return res.status(400).json({ message: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashed,
        role: 'rescuer',
      });

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({ token, user });
    }

    // Public registration must always create a regular user account.
    if (role === 'admin' || role === 'rescuer') {
      return res.status(403).json({ message: 'Admin or rescuer accounts cannot be created from public registration' });
    }

    // standard email-based registration
    if (!name || !normalizedEmail || !password)
      return res.status(400).json({ message: 'All fields required' });

    if (termsAccepted !== true) {
      return res.status(400).json({ message: 'You must accept the Terms and Conditions to register' });
    }

    // check duplicate
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing)
      return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashed,
      role: 'user',
      termsAccepted: true,
      termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : new Date(),
      termsVersion: acceptedVersion,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------
   LOGIN
--------------------------------*/
router.post('/login', async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    const normalizedUsername = username ? String(username).trim() : '';
    const normalizedIdentifier = identifier ? String(identifier).trim() : '';
    const loginValue = normalizedIdentifier || normalizedEmail || normalizedUsername;

    if (!loginValue || !password) {
      return res.status(400).json({ message: 'Username or email and password are required' });
    }

    let user;
    if (loginValue.includes('@')) {
      user = await User.findOne({ email: loginValue.toLowerCase() });
    } else {
      user = await User.findOne({ username: loginValue });
    }

    if (!user)
      return res.status(401).json({ message: 'Invalid username/email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------
   FORGOT PASSWORD
--------------------------------*/
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return a generic response for unknown emails to avoid account enumeration.
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a reset code has been sent.'
      });
    }

    const resetCode = buildResetCode();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    user.resetPasswordCode = hashedCode;
    user.resetPasswordCodeExpires = codeExpiresAt;
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = tokenExpiresAt;
    await user.save();

    if (isSmtpConfigured()) {
      const transporter = getMailer();
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: normalizedEmail,
        subject: 'SALBA Password Reset',
        text: `Your SALBA password reset code is ${resetCode}. It expires in 10 minutes.\n\nOr reset directly using this link: ${resetUrl}`,
        html: `<p>Your SALBA password reset code is:</p><h2 style="letter-spacing:2px;">${resetCode}</h2><p>This code expires in 10 minutes.</p><p>Or click here to reset directly:</p><p><a href="${resetUrl}">Click here to reset password</a></p>`,
      });

      return res.json({
        message: 'Reset email sent. You can use either the code or the reset link.'
      });
    }

    // Dev fallback when SMTP is not configured yet.
    return res.json({
      message: 'Email service is not configured. Use development reset code or reset URL.',
      devResetCode: resetCode,
      resetUrl
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------
   RESET PASSWORD
--------------------------------*/
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, token, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let user = null;
    const now = new Date();

    // Option A: reset using link token.
    if (token) {
      const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: now }
      });
    }

    // Option B: reset using email + code.
    if (!user && email && code) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const hashedCode = crypto.createHash('sha256').update(String(code)).digest('hex');
      user = await User.findOne({
        email: normalizedEmail,
        resetPasswordCode: hashedCode,
        resetPasswordCodeExpires: { $gt: now }
      });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token/code' });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetPasswordCode = null;
    user.resetPasswordCodeExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------
   ADMIN-ONLY: CREATE RESCUER
--------------------------------*/
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Forbidden: Admin only" });

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Admin creates rescuer manually
router.post('/create-rescuer', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "rescuer",
    });

    res.json({ message: "Rescuer created successfully", user });
  } catch (err) {
    console.error("Create rescuer error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------
   ADMIN-ONLY: CREATE ADMIN
--------------------------------*/
router.post('/admins', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, email, username, phone, password } = req.body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    const normalizedUsername = username ? String(username).trim() : '';
    const normalizedPhone = phone ? String(phone).trim() : '';

    if (!name || !normalizedEmail || !normalizedUsername || !normalizedPhone || !password) {
      return res.status(400).json({ message: 'Name, email, username, number, and password are required' });
    }

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ username: normalizedUsername }),
    ]);

    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const admin = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      phone: normalizedPhone,
      password: hashed,
      role: 'admin',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: 'admin-created',
    });

    return res.status(201).json({
      message: 'Admin account created successfully',
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        phone: admin.phone,
        role: admin.role,
      }
    });
  } catch (err) {
    console.error('Create admin error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------
   UPDATE PROFILE
--------------------------------*/
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, username, phone, jobTitle, picture, currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update name
    if (name) user.name = name;
    
    // Update username (check for uniqueness if different)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }
    
    // Update phone
    if (phone) user.phone = phone;
    
    // Update job title
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    
    // Update picture (as base64 or URL)
    if (picture) user.picture = picture;
    
    // Email cannot be changed (silently ignore)
    // if (email && email !== user.email) { ... }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // Return updated user without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      phone: user.phone,
      jobTitle: user.jobTitle,
      picture: user.picture,
      role: user.role
    };

    res.json({ message: "Profile updated successfully", user: userResponse });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------
   GOOGLE OAUTH LOGIN
--------------------------------*/
router.post('/google-login', async (req, res) => {
  try {
    const { credential, termsAccepted, termsVersion, termsAcceptedAt } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'No credential provided' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      if (termsAccepted !== true) {
        return res.status(400).json({ message: 'You must accept the Terms and Conditions to register with Google' });
      }

      // Create new user from Google info
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        picture: picture,
        role: 'user',
        password: await bcrypt.hash(Math.random().toString(), 10), // Random password for OAuth users
        termsAccepted: true,
        termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : new Date(),
        termsVersion: termsVersion || '2026-04-09',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Google authentication failed" });
  }
});

/* ==============================
   BLOCK/UNBLOCK USER (ADMIN ONLY)
  ============================== */
router.patch('/:userId/block-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked } = req.body;
    
    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ message: 'blocked must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { blocked },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✓ User ${user.name} ${blocked ? 'blocked' : 'unblocked'}`);
    res.json({ message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ==============================
   UPDATE RESCUER DUTY STATUS
  ============================== */
router.patch('/:userId/duty-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { dutyStatus } = req.body;
    
    if (!['on-duty', 'off-duty'].includes(dutyStatus)) {
      return res.status(400).json({ message: 'dutyStatus must be "on-duty" or "off-duty"' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { dutyStatus },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✓ Rescuer ${user.name} duty status updated to: ${dutyStatus}`);
    res.json({ message: 'Duty status updated successfully', user });
  } catch (err) {
    console.error('Update duty status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
