/**
 * Migration: Link orphan AIDoctor records to User records.
 *
 * Run: node scripts/migrate-link-aidoctor-users.js
 *
 * This finds all AIDoctor records with user=null, creates corresponding
 * User records, and links them. After this migration, the `user` field
 * on AIDoctor can be made required.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/voa';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const AIDoctor = require('../src/ai/models/AIDoctor');
  const User = require('../src/models/User');

  const orphans = await AIDoctor.find({ user: null }).lean();
  if (orphans.length === 0) {
    console.log('No orphan AIDoctor records found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`Found ${orphans.length} orphan AIDoctor(s):`);
  for (const doc of orphans) {
    console.log(`  - ${doc.name} (${doc.email || 'no email'}, ${doc.phone})`);

    const user = await User.create({
      fullName: doc.name,
      email: doc.email || `${doc.phone.replace(/\D/g, '').slice(-9)}@temp.voa.org`,
      password: doc.phone.replace(/\D/g, '').slice(-6),
      phone: doc.phone,
      role: 'doctor',
      gender: 'other',
      status: 'active',
      isEmailVerified: true,
    });
    console.log(`    → Created User: ${user.email} (${user._id})`);

    await AIDoctor.findByIdAndUpdate(doc._id, { user: user._id });
    console.log(`    → Linked AIDoctor.${doc._id} → User.${user._id}`);
  }

  console.log('\nMigration complete. You can now set `user: { required: true }` on AIDoctor schema.');
  process.exit(0);
}

run().catch(err => { console.error('Migration failed:', err); process.exit(1); });
