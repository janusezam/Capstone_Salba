// Update password with CORRECT hash
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Correct hash for password: 123456
    const correctHash = '$2b$10$pvbuanOhmyv3kMcIlZT7f.3EF60.9j52W6or8BYDPe8b7RxeRIg7y';
    
    const result = await User.updateOne(
      { email: 'janusezam@gmail.com' },
      { password: correctHash }
    );
    
    console.log('✓ Password updated with CORRECT hash');
    
    const user = await User.findOne({ email: 'janusezam@gmail.com' });
    console.log('User:', user.name, '-', user.email);
    console.log('Password hash updated');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
