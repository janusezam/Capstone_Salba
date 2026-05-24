// seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/relief_db';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'password123';
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin already exists:', email);
      process.exit(0);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ name: 'Admin', email, password: passwordHash, role: 'admin' });
    console.log('Created admin:', u.email, 'password:', password);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
