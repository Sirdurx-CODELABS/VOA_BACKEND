const mongoose = require('mongoose');

const scheduleDaySchema = new mongoose.Schema({
  day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
  isAvailable: { type: Boolean, default: false },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  type: { type: String, enum: ['online', 'physical', 'both', ''], default: '' },
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  medicalLicense: { type: String, required: true, trim: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  specialization: { type: String, trim: true, default: '' },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  lga: { type: String, trim: true, default: '' },
  languages: [{ type: String, trim: true }],
  consultationType: { type: String, enum: ['online', 'physical', 'both'], default: 'both' },
  schedule: [scheduleDaySchema],
  maxDailyPatients: { type: Number, default: 20 },
  consultationFee: { type: Number, default: 0 },
  yearsOfExperience: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  todayPatientCount: { type: Number, default: 0 },
  lastAvailabilityUpdate: { type: Date, default: null },
}, { timestamps: true });

doctorSchema.index({ state: 1, lga: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isAvailable: 1 });
doctorSchema.index({ user: 1 });

module.exports = mongoose.model('AIDoctor', doctorSchema);
