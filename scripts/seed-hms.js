/**
 * Seed Script — Hospital Management System (HMS) + Organisation Portal
 *
 * Usage: node scripts/seed-hms.js
 *
 * Seeds:
 *   12 Hospitals with departments
 *   150+ Users across all HMS and Org roles
 *   Staff profiles with specializations, schedules, licenses
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');

const HOSPITALS = [
  {
    name: 'Aminu Kano Teaching Hospital',
    code: 'AKTH',
    state: 'Kano',
    lga: 'Kano Municipal',
    address: 'Zaria Road, Kano',
    lat: 11.9974, lng: 8.5247,
    phone: '080-AKTH-0001',
    email: 'info@akth.gov.ng',
    status: 'active',
  },
  {
    name: 'Murtala Muhammad Specialist Hospital',
    code: 'MMSH',
    state: 'Kano',
    lga: 'Kano Municipal',
    address: 'Murtala Muhammad Way, Kano',
    lat: 11.9901, lng: 8.5125,
    phone: '080-MMSH-0001',
    email: 'info@mmsh.gov.ng',
    status: 'active',
  },
  {
    name: 'Muhammadu Abdullahi Wase Teaching Hospital',
    code: 'MAWTH',
    state: 'Kano',
    lga: 'Nasarawa',
    address: 'Nasarawa GRA, Kano',
    lat: 11.9812, lng: 8.5398,
    phone: '080-MAWTH-001',
    email: 'info@mawth.edu.ng',
    status: 'active',
  },
  {
    name: 'National Hospital Abuja',
    code: 'NHA',
    state: 'FCT',
    lga: 'Abuja Municipal',
    address: 'Plot 132, Central District, Abuja',
    lat: 9.0407, lng: 7.4920,
    phone: '080-NHA-0001',
    email: 'info@nationalhospital.gov.ng',
    status: 'active',
  },
  {
    name: 'General Hospital Dala',
    code: 'GHD',
    state: 'Kano',
    lga: 'Dala',
    address: 'Dala Local Government, Kano',
    lat: 12.0005, lng: 8.5200,
    phone: '080-GHD-0001',
    email: 'ghdala@kanohospitals.gov.ng',
    status: 'active',
  },
  {
    name: 'General Hospital Bichi',
    code: 'GHB',
    state: 'Kano',
    lga: 'Bichi',
    address: 'Bichi Town, Kano State',
    lat: 12.2315, lng: 8.2408,
    phone: '080-GHB-0001',
    email: 'ghbichi@kanohospitals.gov.ng',
    status: 'active',
  },
  {
    name: 'General Hospital Gwale',
    code: 'GHG',
    state: 'Kano',
    lga: 'Gwale',
    address: 'Gwale Local Government, Kano',
    lat: 11.9850, lng: 8.4950,
    phone: '080-GHG-0001',
    email: 'ghgwale@kanohospitals.gov.ng',
    status: 'active',
  },
  {
    name: 'General Hospital Tarauni',
    code: 'GHT',
    state: 'Kano',
    lga: 'Tarauni',
    address: 'Tarauni Local Government, Kano',
    lat: 11.9770, lng: 8.5430,
    phone: '080-GHT-0001',
    email: 'ghtarauni@kanohospitals.gov.ng',
    status: 'active',
  },
  {
    name: 'General Hospital Nasarawa',
    code: 'GHN',
    state: 'Kano',
    lga: 'Nasarawa',
    address: 'Nasarawa Local Government, Kano',
    lat: 11.9789, lng: 8.5380,
    phone: '080-GHN-0001',
    email: 'ghnasarawa@kanohospitals.gov.ng',
    status: 'active',
  },
  {
    name: 'General Hospital Kano Municipal',
    code: 'GHKM',
    state: 'Kano',
    lga: 'Kano Municipal',
    address: 'Kano City, Kano State',
    lat: 12.0000, lng: 8.5167,
    phone: '080-GHKM-0001',
    email: 'ghkm@kanohospitals.gov.ng',
    status: 'active',
  },
  {
    name: 'Federal Medical Centre Yola',
    code: 'FMCY',
    state: 'Adamawa',
    lga: 'Yola North',
    address: 'Jimeta, Yola, Adamawa State',
    lat: 9.2035, lng: 12.3950,
    phone: '080-FMCY-0001',
    email: 'info@fmcyola.gov.ng',
    status: 'active',
  },
  {
    name: 'University of Nigeria Teaching Hospital',
    code: 'UNTH',
    state: 'Enugu',
    lga: 'Enugu North',
    address: 'Ituku-Ozalla, Enugu State',
    lat: 6.4260, lng: 7.5140,
    phone: '080-UNTH-0001',
    email: 'info@unth.edu.ng',
    status: 'active',
  },
];

const DEPARTMENTS = [
  'HIV Clinic', 'TB Clinic', 'Pharmacy', 'Laboratory',
  'Radiology', 'Emergency', 'Outpatient', 'Paediatrics',
  'Obstetrics & Gynaecology', 'Internal Medicine', 'Nutrition', 'Mental Health',
  'Cardiology', 'Orthopaedics', 'Ophthalmology', 'Dental',
];

const SPECIALIZATIONS = [
  'General Medicine', 'Internal Medicine', 'Paediatrics', 'Obstetrics & Gynaecology',
  'Orthopaedics', 'Cardiology', 'Neurology', 'Psychiatry',
  'Radiology', 'Pathology', 'Ophthalmology', 'ENT',
  'Dermatology', 'Family Medicine', 'Emergency Medicine', 'Public Health',
  'Infectious Disease', 'HIV Medicine', 'Tuberculosis', 'Nutrition',
];

const LANGUAGES = ['English', 'Hausa', 'Yoruba', 'Igbo', 'Pidgin'];

const FIRST_NAMES_MALE = [
  'Ibrahim', 'Abdullahi', 'Sani', 'Musa', 'Usman', 'Kabiru', 'Sulaiman',
  'Muhammad', 'Aminu', 'Tijjani', 'Bello', 'Haruna', 'Yusuf', 'Ismail',
  'Nura', 'Zubairu', 'Habibu', 'Hamza', 'Bashir', 'Rilwanu',
  'Chinedu', 'Emeka', 'Obinna', 'Nnamdi', 'Uchenna', 'Kelechi',
  'Segun', 'Babatunde', 'Tunde', 'Adebayo', 'Olawale', 'Femi',
  'James', 'Emmanuel', 'Daniel', 'Samuel', 'Joseph', 'John',
];

const FIRST_NAMES_FEMALE = [
  'Aisha', 'Fatima', 'Zainab', 'Hauwa', 'Safiya', 'Maryam', 'Rahma',
  'Habiba', 'Sa\'adatu', 'Aminah', 'Halima', 'Bilkisu', 'Nafisatu',
  'Zuwaira', 'Maimuna', 'Aishatu',
  'Nkechi', 'Chiamaka', 'Ngozi', 'Chioma', 'Amarachi', 'Onyinyechi',
  'Yetunde', 'Adebimpe', 'Adesola', 'Funmilayo', 'Titilayo', 'Oluwaseun',
  'Blessing', 'Gloria', 'Grace', 'Faith', 'Mercy', 'Precious',
];

const SURNAMES = [
  'Abubakar', 'Sani', 'Bello', 'Musa', 'Ibrahim', 'Yahaya', 'Adamu',
  'Usman', 'Danjuma', 'Umar', 'Suleiman', 'Mohammed', 'Garba', 'Yusuf',
  'Isah', 'Yakubu', 'Lawal', 'Saleh', 'Abdullahi', 'Jibril',
  'Okonkwo', 'Okafor', 'Nwachukwu', 'Eze', 'Ikechukwu', 'Ugwu',
  'Adebayo', 'Ogunleye', 'Akinlade', 'Balogun', 'Olawale', 'Adekunle',
  'Okeke', 'Nwosu', 'Egbuna', 'Udeh', 'Onyema', 'Okafor',
  'Friday', 'Sunday', 'Markus', 'Danladi', 'Bulus', 'Habila',
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomNumber(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getPhone() { return `080${String(randomNumber(10000000, 99999999))}`; }

function pickNames() {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const first = randomFrom(gender === 'male' ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  const sur = randomFrom(SURNAMES);
  return { fullName: `${first} ${sur}`, gender, email: `${first.toLowerCase()}.${sur.toLowerCase()}${randomNumber(1, 99)}@voa.health` };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function seed() {
  await connectDB();

  const User = require('../src/models/User');
  const AIHospital = require('../src/ai/models/AIHospital');
  const Department = require('../src/ai/models/Department');
  const StaffProfile = require('../src/ai/models/StaffProfile');

  const PASSWORD = 'Password123!';

  console.log('=== Seeding HMS Portal ===\n');

  // ── Create Hospitals ──────────────────────────────────────────────
  console.log('Creating hospitals...');
  const hospitalDocs = [];
  for (const h of HOSPITALS) {
    let hospital = await AIHospital.findOne({ name: h.name });
    if (!hospital) {
      const { code, lat, lng, ...rest } = h;
      hospital = await AIHospital.create({
        ...rest,
        services: DEPARTMENTS,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      });
      console.log(`  ✓ ${hospital.name} (${code})`);
    } else {
      console.log(`  ○ ${hospital.name} (exists)`);
    }
    hospitalDocs.push(hospital);
  }

  // ── Create Departments ─────────────────────────────────────────────
  console.log('\nCreating departments...');
  for (const hospital of hospitalDocs) {
    for (const deptName of DEPARTMENTS) {
      const existing = await Department.findOne({ name: deptName, hospital: hospital._id });
      if (!existing) {
        await Department.create({
          name: deptName,
          hospital: hospital._id,
          description: `${deptName} Department`,
        });
      }
    }
    const original = HOSPITALS.find(h => h.name === hospital.name);
    console.log(`  ✓ ${DEPARTMENTS.length} departments for ${original?.code || hospital.name}`);
  }

  // ── User generators ────────────────────────────────────────────────
  let totalCreated = 0;

  async function createUser(role, hospital = null, extra = {}) {
    const { fullName, gender, email } = pickNames();
    const phone = getPhone();
    const existing = await User.findOne({ email });
    if (existing) return existing;

    const user = await User.create({
      fullName,
      email,
      phone,
      password: PASSWORD,
      role,
      gender,
      status: 'active',
      isEmailVerified: true,
    });

    if (hospital && (
      role === 'doctor' || role === 'nurse' || role === 'pharmacist' ||
      role === 'lab_scientist' || role === 'adherence_counselor' ||
      role === 'case_manager' || role === 'receptionist' ||
      role === 'data_officer' || role === 'hospital_admin' ||
      role === 'medical_records_officer' || role === 'radiographer' ||
      role === 'nutritionist' || role === 'counselor'
    )) {
      const profileData = {
        user: user._id,
        hospital: hospital._id,
        department: randomFrom(DEPARTMENTS),
        role,
        staffId: `${hospital.name.substring(0, 4).toUpperCase()}-${role.substring(0, 3).toUpperCase()}${String(randomNumber(100, 999))}`,
        specialization: randomFrom(SPECIALIZATIONS),
        qualifications: [`MBBS`, `FWACS`].slice(0, randomNumber(1, 2)),
        isAvailable: true,
        status: 'active',
        joinedAt: new Date(),
        schedule: DAYS.slice(0, randomNumber(4, 6)).map(day => ({
          day: day.toLowerCase(),
          isAvailable: true,
          startTime: '08:00',
          endTime: '16:00',
        })),
        services: [{ name: 'General Consultation', price: randomNumber(500, 5000) }],
        ...extra,
      };

      if (role === 'doctor') {
        profileData.medicalLicense = `ML-${String(randomNumber(10000, 99999))}`;
        profileData.consultationFee = randomNumber(1000, 10000);
        profileData.maxDailyPatients = randomNumber(15, 30);
        profileData.languages = [randomFrom(LANGUAGES), randomFrom(LANGUAGES)];
        profileData.yearsOfExperience = randomNumber(3, 25);
      }
      if (role === 'nurse') {
        profileData.shift = randomFrom(['morning', 'afternoon', 'night']);
        profileData.ward = randomFrom(['General', 'HIV', 'Paediatric', 'Emergency', 'Maternity']);
      }
      if (role === 'pharmacist') {
        profileData.pharmacyLicenseNumber = `PCN-${String(randomNumber(10000, 99999))}`;
      }
      if (role === 'lab_scientist') {
        profileData.labCertifications = [randomFrom(['MLSCN', 'ASCp', 'HCPC'])];
      }
      if (role === 'adherence_counselor' || role === 'counselor') {
        profileData.counselingSpecialties = [randomFrom(['HIV Adherence', 'Mental Health', 'Substance Abuse', 'General Counseling'])];
        profileData.languages = [randomFrom(LANGUAGES), randomFrom(LANGUAGES)];
      }
      if (role === 'case_manager') {
        profileData.caseloadLimit = randomNumber(30, 100);
      }

      await StaffProfile.create(profileData);
    }

    totalCreated++;
    return user;
  }

  // ── Batch HMS Users ────────────────────────────────────────────────
  console.log('\nCreating Hospital Administrators...');
  for (let i = 0; i < 12; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('hospital_admin', hospital);
  }

  console.log('Creating Doctors...');
  for (let i = 0; i < 25; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('doctor', hospital, {
      yearsOfExperience: randomNumber(3, 25),
      languages: [randomFrom(LANGUAGES), randomFrom(LANGUAGES)],
    });
  }

  console.log('Creating Nurses...');
  for (let i = 0; i < 40; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('nurse', hospital);
  }

  console.log('Creating Pharmacists...');
  for (let i = 0; i < 15; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('pharmacist', hospital);
  }

  console.log('Creating Laboratory Scientists...');
  for (let i = 0; i < 15; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('lab_scientist', hospital);
  }

  console.log('Creating Adherence Counselors...');
  for (let i = 0; i < 15; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('adherence_counselor', hospital);
  }

  console.log('Creating Case Managers...');
  for (let i = 0; i < 10; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('case_manager', hospital);
  }

  console.log('Creating Receptionists...');
  for (let i = 0; i < 15; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('receptionist', hospital);
  }

  console.log('Creating Medical Records Officers...');
  for (let i = 0; i < 15; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('medical_records_officer', hospital);
  }

  console.log('Creating Radiographers...');
  for (let i = 0; i < 10; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('radiographer', hospital);
  }

  console.log('Creating Nutritionists...');
  for (let i = 0; i < 10; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('nutritionist', hospital);
  }

  console.log('Creating Counselors...');
  for (let i = 0; i < 10; i++) {
    const hospital = hospitalDocs[i % hospitalDocs.length];
    await createUser('counselor', hospital);
  }

  // ── Batch Org Users ────────────────────────────────────────────────
  console.log('\n=== Seeding Organisation Portal ===\n');

  console.log('Creating Organisation Administrators...');
  for (let i = 0; i < 10; i++) {
    await createUser('org_admin');
  }

  console.log('Creating Programme Officers...');
  for (let i = 0; i < 15; i++) {
    await createUser('programme_officer');
  }

  console.log('Creating Support Group Leaders...');
  for (let i = 0; i < 20; i++) {
    await createUser('support_group_leader');
  }

  console.log('Creating Finance Officers...');
  for (let i = 0; i < 8; i++) {
    await createUser('finance_officer');
  }

  console.log('Creating M&E Officers...');
  for (let i = 0; i < 8; i++) {
    await createUser('mande_officer');
  }

  console.log('Creating Volunteers...');
  for (let i = 0; i < 20; i++) {
    await createUser('volunteer');
  }

  // Ensure super_admin exists
  const superAdmin = await User.findOne({ email: 'admin@voa.health' });
  if (!superAdmin) {
    await User.create({
      fullName: 'Super Admin',
      email: 'admin@voa.health',
      phone: '08000000000',
      password: PASSWORD,
      role: 'super_admin',
      gender: 'male',
      status: 'active',
      isEmailVerified: true,
    });
    console.log('  ✓ Super Admin (admin@voa.health / Password123!)');
  }

  // Print summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('SEED COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`\nTotal users created: ${totalCreated}`);
  console.log(`\nDefault password for ALL users: ${PASSWORD}`);
  console.log(`\nHMS Portal: /hms/login`);
  console.log(`  - Email or Phone (auto-detected)`);
  console.log(`  - Password: ${PASSWORD}`);
  console.log(`\nOrg Portal: /login`);
  console.log(`  - Email or Phone (auto-detected)`);
  console.log(`  - Password: ${PASSWORD}`);
  console.log(`\nSuper Admin: admin@voa.health / ${PASSWORD}`);
  console.log(`\nExample HMS users (query your MongoDB for exact emails):`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
