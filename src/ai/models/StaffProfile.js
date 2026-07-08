const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  number: { type: String, required: true },
  issuingBody: { type: String, required: true },
  expiryDate: Date,
  isVerified: { type: Boolean, default: false },
}, { _id: false });

const scheduleDaySchema = new mongoose.Schema({
  day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
  isAvailable: { type: Boolean, default: false },
  startTime: String,
  endTime: String,
}, { _id: false });

const staffProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  department: { type: String, trim: true },
  staffId: { type: String, trim: true },                    // Hospital employee ID
  role: { type: String, required: true, index: true },      // mirrors User.role for fast queries
  specialization: { type: String, trim: true },
  qualifications: [{ type: String, trim: true }],
  licenses: [licenseSchema],
  schedule: [scheduleDaySchema],
  isAvailable: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'on_leave', 'inactive'], default: 'active' },
  joinedAt: Date,
  // Doctor-specific
  medicalLicense: { type: String, trim: true },
  consultationFee: { type: Number, default: 0 },
  maxDailyPatients: { type: Number, default: 20 },
  todayPatientCount: { type: Number, default: 0 },
  services: [{
    name: { type: String, required: true },
    description: String,
    price: Number,
  }],
  // Pharmacist-specific
  pharmacyLicenseNumber: { type: String, trim: true },
  // Lab-specific
  labCertifications: [{ type: String, trim: true }],
  // Counselor-specific
  counselingSpecialties: [{ type: String, trim: true }],
  // Case Manager-specific
  caseloadLimit: { type: Number, default: 50 },
}, {
  timestamps: true,
});

staffProfileSchema.index({ hospital: 1, role: 1 });
staffProfileSchema.index({ hospital: 1, department: 1 });
staffProfileSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('StaffProfile', staffProfileSchema);
