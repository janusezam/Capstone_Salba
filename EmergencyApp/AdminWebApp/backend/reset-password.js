require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const newPassword = '123456';
    const hashed = await bcrypt.hash(newPassword, 10);
    
    const result = await User.updateOne(
      { email: 'sagayocbutch@gmail.com' },
      { password: hashed }
    );
    
    console.log('✓ Password updated for sagayocbutch@gmail.com');
    console.log('New hash:', hashed);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
