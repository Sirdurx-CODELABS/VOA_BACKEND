const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const scheduleDaySchema = new mongoose.Schema({
  day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
  isAvailable: { type: Boolean, default: false },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  type: { type: String, enum: ['online', 'physical', 'both', ''], default: '' },
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, /* Run scripts/migrate-link-aidoctor-users.js before enabling this */
  name: { type: String, required: true, trim: true },
  medicalLicense: { type: String, required: true, trim: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  department: { type: String, trim: true, default: '' },
  specialization: { type: String, trim: true, default: '' },
  qualification: { type: String, trim: true, default: '' },
  biography: { type: String, trim: true, default: '' },
  photo: { type: String, trim: true, default: '' },
  certificates: [{ type: String, trim: true }],
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: '' },
  password: { type: String, select: false },
  state: { type: String, trim: true, default: '' },
  lga: { type: String, trim: true, default: '' },
  languages: [{ type: String, trim: true }],
  consultationType: { type: String, enum: ['online', 'physical', 'both'], default: 'both' },
  schedule: [scheduleDaySchema],
  maxDailyPatients: { type: Number, default: 20 },
  consultationFee: { type: Number, default: 0 },
  services: [serviceSchema],
  yearsOfExperience: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  todayPatientCount: { type: Number, default: 0 },
  lastAvailabilityUpdate: { type: Date, default: null },
}, { timestamps: true });

doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

doctorSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

doctorSchema.index({ state: 1, lga: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isAvailable: 1 });
doctorSchema.index({ user: 1 });
doctorSchema.index({ email: 1 });
doctorSchema.index({ phone: 1 });

module.exports = mongoose.model('AIDoctor', doctorSchema);
