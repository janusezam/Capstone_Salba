// Update password for janusezam@gmail.com to 123456
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Hash for password: 123456
    const hash = '$2b$10$wvMJAK9fZHa/qRd3WLQJ6OgjU0TpnKgMzHnTvyVvVrJvU1lO9GG.2';
    
    const result = await User.updateOne(
      { email: 'janusezam@gmail.com' },
      { password: hash }
    );
    
    console.log('✓ Password updated for janusezam@gmail.com to: 123456');
    
    const user = await User.findOne({ email: 'janusezam@gmail.com' });
    console.log('User:', user.name, '-', user.email);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
