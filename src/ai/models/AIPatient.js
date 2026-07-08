const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  weight: { type: Number, default: null },
  height: { type: Number, default: null },
  temperature: { type: Number, default: null },
  bloodPressureSystolic: { type: Number, default: null },
  bloodPressureDiastolic: { type: Number, default: null },
  pulse: { type: Number, default: null },
  respiration: { type: Number, default: null },
  oxygenSaturation: { type: Number, default: null },
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  recordedAt: { type: Date, default: Date.now },
}, { _id: false });

const triageSchema = new mongoose.Schema({
  category: { type: String, enum: ['emergency', 'urgent', 'semi_urgent', 'non_urgent', ''], default: '' },
  status: { type: String, enum: ['pending', 'completed', ''], default: '' },
  notes: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  performedAt: { type: Date, default: null },
}, { _id: false });

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  age: { type: Number, default: null },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  state: { type: String, trim: true, default: '' },
  lga: { type: String, trim: true, default: '' },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  diagnosis: {
    hiv: { type: Boolean, default: false },
    tb: { type: Boolean, default: false },
    oi: { type: Boolean, default: false },
  },
  artNumber: { type: String, trim: true, default: '' },
  fileNumber: { type: String, trim: true, default: '' },
  currentDrugs: { type: String, default: '' },
  preferredHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  preferredDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', default: null },
  preferredConsultation: { type: String, enum: ['online', 'in-person', ''], default: '' },
  consentStatus: { type: Boolean, default: false },
  emergencyContact: { type: String, default: '' },
  source: { type: String, enum: ['whatsapp', 'web', 'mobile'], default: 'web' },
  metadata: { type: Map, of: String, default: {} },
  // Clinical fields
  chiefComplaint: { type: String, default: '' },
  painLevel: { type: Number, default: 0, min: 0, max: 10 },
  triage: { type: triageSchema, default: () => ({}) },
  vitals: { type: vitalsSchema, default: () => ({}) },
  vitalsHistory: [vitalsSchema],
}, { timestamps: true });

patientSchema.index({ phone: 1 });
patientSchema.index({ userId: 1 });
patientSchema.index({ state: 1, lga: 1 });
patientSchema.index({ 'triage.status': 1 });

module.exports = mongoose.model('AIPatient', patientSchema);
