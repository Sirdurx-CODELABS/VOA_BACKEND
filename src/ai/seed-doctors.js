require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const AIDoctor = require('./models/AIDoctor');

const doctors = [
  {
    name: 'Dr. Adebayo Ogunlesi',
    medicalLicense: 'MD/L/2024/4521',
    specialization: 'General Practice',
    phone: '+234 802 345 6789',
    email: 'adebayo.ogunlesi@voa.health',
    password: 'doctor123',
    state: 'Lagos',
    lga: 'Ikeja',
    languages: ['English', 'Yoruba'],
    consultationType: 'both',
    consultationFee: 5000,
    services: [
      { name: 'General Consultation', description: 'Full medical consultation and diagnosis', price: 5000 },
      { name: 'Health Checkup', description: 'Comprehensive annual health screening', price: 15000 },
      { name: 'Malaria Test & Treatment', description: 'RDT test + medication', price: 8000 },
      { name: 'Blood Pressure Check', description: 'BP monitoring and advice', price: 3000 },
    ],
    yearsOfExperience: 8,
    maxDailyPatients: 15,
    isAvailable: true,
    isVerified: true,
    schedule: [
      { day: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00', type: 'both' },
      { day: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00', type: 'both' },
      { day: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00', type: 'both' },
      { day: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00', type: 'both' },
      { day: 'friday', isAvailable: true, startTime: '09:00', endTime: '13:00', type: 'online' },
      { day: 'saturday', isAvailable: false, startTime: '', endTime: '', type: '' },
      { day: 'sunday', isAvailable: false, startTime: '', endTime: '', type: '' },
    ],
  },
  {
    name: 'Dr. Ngozi Eze',
    medicalLicense: 'MD/FCT/2023/8876',
    specialization: 'Pediatrics & Adolescent Health',
    phone: '+234 803 987 6543',
    email: 'ngozi.eze@voa.health',
    password: 'doctor123',
    state: 'Federal Capital Territory',
    lga: 'Abuja Municipal',
    languages: ['English', 'Igbo', 'Hausa'],
    consultationType: 'online',
    consultationFee: 7000,
    services: [
      { name: 'Online Consultation', description: 'Video/phone consultation for adolescents', price: 7000 },
      { name: ' Adolescent Counseling', description: 'Mental health and wellness counseling session', price: 10000 },
      { name: 'Nutrition Assessment', description: 'Dietary evaluation and meal planning', price: 8000 },
      { name: 'Sexual Health Advice', description: 'Confidential sexual health consultation', price: 6000 },
    ],
    yearsOfExperience: 12,
    maxDailyPatients: 10,
    isAvailable: true,
    isVerified: true,
    schedule: [
      { day: 'monday', isAvailable: true, startTime: '10:00', endTime: '18:00', type: 'online' },
      { day: 'tuesday', isAvailable: true, startTime: '10:00', endTime: '18:00', type: 'online' },
      { day: 'wednesday', isAvailable: true, startTime: '10:00', endTime: '18:00', type: 'online' },
      { day: 'thursday', isAvailable: true, startTime: '10:00', endTime: '18:00', type: 'online' },
      { day: 'friday', isAvailable: true, startTime: '10:00', endTime: '16:00', type: 'online' },
      { day: 'saturday', isAvailable: false, startTime: '', endTime: '', type: '' },
      { day: 'sunday', isAvailable: false, startTime: '', endTime: '', type: '' },
    ],
  },
];

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/development';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const force = process.argv.includes('--force');
  for (const doc of doctors) {
    if (force) await AIDoctor.deleteOne({ phone: doc.phone });
    const existing = await AIDoctor.findOne({ phone: doc.phone });
    if (existing) {
      // Update with new data
      await AIDoctor.updateOne({ phone: doc.phone }, doc);
      console.log(`Updated ${doc.name} (${doc.phone})`);
    } else {
      await AIDoctor.create(doc);
      console.log(`Created ${doc.name} (${doc.phone})`);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error(err); process.exit(1); });
