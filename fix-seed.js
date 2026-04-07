require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixSeed() {
  console.log('\n🔗 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected!\n');

    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, lowercase: true, trim: true },
      password: String,
      phone: { type: String, default: '' },
      role: { type: String, default: 'user' },
      isActive: { type: Boolean, default: true },
      lastLogin: Date,
      createdAt: { type: Date, default: Date.now }
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Remove old test accounts
    const deleted = await User.deleteMany({ 
      email: { $in: ['admin@luxeflights.com', 'demo@luxeflights.com'] } 
    });
    console.log(`🗑️  Removed ${deleted.deletedCount} old account(s)`);

    // Hash passwords
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const demoHash  = await bcrypt.hash('Demo@123', 12);

    // Create admin
    const admin = await User.create({
      name: 'Luxe Admin',
      email: 'admin@luxeflights.com',
      password: adminHash,
      role: 'admin',
      isActive: true
    });
    console.log('👑 Admin created  →  admin@luxeflights.com  /  Admin@123');

    // Create demo user
    const demo = await User.create({
      name: 'Sarah Connor',
      email: 'demo@luxeflights.com',
      password: demoHash,
      role: 'user',
      isActive: true
    });
    console.log('👤 User created   →  demo@luxeflights.com   /  Demo@123');

    // Verify passwords directly
    const adminOk = await bcrypt.compare('Admin@123', admin.password);
    const demoOk  = await bcrypt.compare('Demo@123',  demo.password);

    console.log('\n🔍 Password verification:');
    console.log('   Admin password match:', adminOk ? '✅ YES' : '❌ NO');
    console.log('   Demo  password match:', demoOk  ? '✅ YES' : '❌ NO');

    console.log('\n────────────────────────────────────');
    if(adminOk && demoOk){
      console.log('🎉 SUCCESS! Now do the following:\n');
      console.log('   1. Run:  npm start');
      console.log('   2. Go to: http://localhost:3000/login');
      console.log('   3. Email:    admin@luxeflights.com');
      console.log('   4. Password: Admin@123');
    } else {
      console.log('❌ Something went wrong with password hashing. Contact support.');
    }
    console.log('────────────────────────────────────\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if(err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')){
      console.error('→ MongoDB not reachable. Check your MONGODB_URI in .env');
    }
    if(err.message.includes('Authentication failed')){
      console.error('→ Wrong MongoDB username/password in MONGODB_URI');
    }
    process.exit(1);
  }
}

fixSeed();

