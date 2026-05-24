// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true, sparse: true }, // For rescuer login
  email: { type: String, unique: true, sparse: true },
  password: String,
  phone: { type: String, default: "+63" }, // Phone number with country code
  jobTitle: { type: String, default: null }, // Job title or position
  picture: { type: String, default: null }, // Profile picture URL (from Google OAuth)
  role: { type: String, enum: ["admin", "user", "rescuer"], default: "user" },
  dutyStatus: { type: String, enum: ["on-duty", "off-duty"], default: "off-duty" }, // For rescuers only
  pushToken: { type: String, default: null }, // For Expo push notifications
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  lastLat: { type: Number, default: 0 }, // Last known latitude
  lastLng: { type: Number, default: 0 }, // Last known longitude
  location: { type: String, default: null }, // Current deployment location (formatted string)
  lastLocationUpdate: { type: Date, default: null }, // When location was last updated
  lastLocationCoords: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  blocked: { type: Boolean, default: false }, // Blocked status to prevent spam
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date, default: null },
  termsVersion: { type: String, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  resetPasswordCode: { type: String, default: null },
  resetPasswordCodeExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
