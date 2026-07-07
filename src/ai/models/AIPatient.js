const mongoose = require('mongoose');

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
}, { timestamps: true });

patientSchema.index({ phone: 1 });
patientSchema.index({ userId: 1 });
patientSchema.index({ state: 1, lga: 1 });

module.exports = mongoose.model('AIPatient', patientSchema);
