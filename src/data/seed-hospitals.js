/**
 * Seed script: populates AIHospital collection with reference hospital data.
 * Run: node src/data/seed-hospitals.js
 */
const mongoose = require('mongoose');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const hospitals = require('./nigeria-hospitals');

async function seed() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/voa';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const AIHospital = mongoose.model('AIHospital', new mongoose.Schema({}, { strict: false }), 'aihospitals');

  const existing = await AIHospital.countDocuments();
  console.log(`Existing hospitals in DB: ${existing}`);

  const bulkOps = hospitals
    .filter(h => h.name && h.state)
    .map(h => ({
      updateOne: {
        filter: { name: h.name, state: h.state },
        update: { $setOnInsert: { ...h, isActive: true } },
        upsert: true,
      }
    }));

  if (bulkOps.length) {
    const result = await AIHospital.bulkWrite(bulkOps, { ordered: false });
    console.log(`Inserted: ${result.upsertedCount} hospitals`);
    console.log(`Matched existing: ${result.matchedCount}`);
  } else {
    console.log('No hospitals to insert');
  }

  const total = await AIHospital.countDocuments();
  console.log(`Total in DB now: ${total}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
