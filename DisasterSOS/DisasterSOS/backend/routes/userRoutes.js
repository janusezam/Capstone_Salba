import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import PasswordResetOtp from "../models/PasswordResetOtp.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Please try again later." },
});

const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const normalizePhone = (value = "") => value.replace(/\s|-/g, "").trim();

const loginAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

const loginKey = (phone, ip) => `${phone}:${ip}`;

const getIp = (req) => req.ip || req.headers["x-forwarded-for"] || "unknown";

const checkLockout = (key) => {
  const item = loginAttempts.get(key);
  if (!item) return false;
  if (item.lockUntil && item.lockUntil > Date.now()) return true;
  if (item.lockUntil && item.lockUntil <= Date.now()) loginAttempts.delete(key);
  return false;
};

const recordFailure = (key) => {
  const current = loginAttempts.get(key) || { count: 0, lockUntil: null };
  const count = current.count + 1;
  if (count >= MAX_FAILED_ATTEMPTS) {
    loginAttempts.set(key, { count, lockUntil: Date.now() + LOCKOUT_MS });
    return true;
  }
  loginAttempts.set(key, { count, lockUntil: null });
  return false;
};

const clearFailures = (key) => loginAttempts.delete(key);

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Verify reCAPTCHA v3 token
const verifyRecaptcha = async (token) => {
  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );
    const { success, score, 'error-codes': errorCodes } = response.data;
    console.log("reCAPTCHA response:", response.data);
    // score >= 0.5 is generally considered human
    return success && score >= 0.5;
  } catch (err) {
    console.error("reCAPTCHA verification error:", err);
    return false;
  }
};

// 📝 Register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, recaptchaToken } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || !phone || !password || !email) {
      return res.status(400).json({ message: "Name, email, phone number, and password are required" });
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({ message: "Phone number format is invalid" });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include uppercase, lowercase, and a number" });
    }

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ message: "reCAPTCHA token is missing" });
    }
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({ message: "reCAPTCHA verification failed" });
    }

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: normalizedPhone,
      password: hashedPassword,
      authProvider: "local",
    });
    await user.save();

    // Send welcome email
    const { sendVerificationEmail } = await import("../utils/emailSender.js");
    sendVerificationEmail(user.email, user.name).catch(err => console.error("Email send error:", err));

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, avatar: user.avatar, birthday: user.birthday, location: user.location, role: user.role || 'citizen' },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔐 Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { phone, password, recaptchaToken } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const key = loginKey(normalizedPhone, getIp(req));

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone number and password are required" });
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({ message: "Phone number format is invalid" });
    }

    if (checkLockout(key)) {
      return res.status(429).json({ message: "Too many failed login attempts. Try again in 10 minutes." });
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return res.status(400).json({ message: "reCAPTCHA verification failed" });
      }
    } else {
      return res.status(400).json({ message: "reCAPTCHA token is missing" });
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      recordFailure(key);
      return res.status(400).json({ message: "Invalid phone number or password" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account cannot be used because Google Sign-In is disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const locked = recordFailure(key);
      if (locked) {
        return res.status(429).json({ message: "Too many failed login attempts. Try again in 10 minutes." });
      }
      return res.status(400).json({ message: "Invalid phone number or password" });
    }

    clearFailures(key);

    const token = generateToken(user);
    res.json({
      token,
      user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, avatar: user.avatar, birthday: user.birthday, location: user.location, role: user.role || 'citizen' },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔁 Request password reset OTP (dev mode)
router.post("/forgot-password/request-otp", forgotLimiter, async (req, res) => {
  try {
    const { phone, email } = req.body;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(200).json({ message: "If the account exists, an OTP has been sent to your email." });
      }
    } else if (phone) {
      if (!PHONE_REGEX.test(normalizedPhone)) {
        return res.status(400).json({ message: "Phone number format is invalid" });
      }
      user = await User.findOne({ phone: normalizedPhone });
      if (!user) {
        return res.status(200).json({ message: "If the account exists, an OTP has been generated." });
      }
    } else {
      return res.status(400).json({ message: "Email or phone number is required" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const identifier = email || normalizedPhone;
    await PasswordResetOtp.deleteMany({ phone: identifier });
    await PasswordResetOtp.create({
      phone: identifier,
      otpHash,
      expiresAt,
    });

    // Send OTP via email if user has a registered email address
    if (user && user.email) {
      const { sendPasswordResetEmail } = await import("../utils/emailSender.js");
      sendPasswordResetEmail(user.email, otp).catch(err => console.error("Email send error:", err));
    }

    console.log(`[DEV OTP] Password reset OTP for ${identifier}: ${otp}`);

    const includeDevOtp = (process.env.OTP_DEV_MODE || "true") === "true";
    return res.status(200).json({
      message: email ? "OTP sent to your email. It expires in 10 minutes." : "OTP generated. It expires in 10 minutes.",
      ...(includeDevOtp ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error("Request OTP error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ Verify OTP and issue short-lived reset token
router.post("/forgot-password/verify-otp", forgotLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const identifier = email.toLowerCase();

    const record = await PasswordResetOtp.findOne({ phone: identifier }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(400).json({ message: "No OTP request found" });
    }

    if (record.verified) {
      return res.status(400).json({ message: "OTP already used" });
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.attempts >= record.maxAttempts) {
      return res.status(429).json({ message: "Too many invalid OTP attempts" });
    }

    const isOtpMatch = await bcrypt.compare(String(otp).trim(), record.otpHash);
    if (!isOtpMatch) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    record.verified = true;
    await record.save();

    const resetToken = jwt.sign(
      {
        email: identifier,
        purpose: "forgot_password_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.status(200).json({
      message: "OTP verified",
      resetToken,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// 🔐 Reset password after OTP verification
router.post("/forgot-password/reset", forgotLimiter, async (req, res) => {
  try {
    const { email, newPassword, resetToken } = req.body;
    const normalizedEmail = email ? email.toLowerCase() : null;

    if (!normalizedEmail || !newPassword || !resetToken) {
      return res.status(400).json({ message: "Email, reset token, and new password are required" });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include uppercase, lowercase, and a number" });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired reset token" });
    }

    if (decoded.purpose !== "forgot_password_reset" || decoded.email !== normalizedEmail) {
      return res.status(401).json({ message: "Reset token validation failed" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.authProvider = "local";
    await user.save();

    await PasswordResetOtp.deleteMany({ phone: normalizedEmail });

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// 👤 Get profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✏️ Update profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email, birthday, location } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (birthday !== undefined) user.birthday = birthday;
    if (location !== undefined) user.location = location;

    if (email !== undefined) {
      if (email.trim() !== "") {
        const normalizedEmail = email.toLowerCase().trim();
        const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (existingEmail) {
          return res.status(400).json({ message: "Email already taken by another account" });
        }
        user.email = normalizedEmail;
      } else {
        // Allow removing email
        user.email = null;
      }
    }

    await user.save();
    res.json({
      message: "Profile updated",
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        birthday: user.birthday,
        location: user.location,
        role: user.role || 'citizen',
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔑 Change password
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "Google accounts cannot change password here" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
