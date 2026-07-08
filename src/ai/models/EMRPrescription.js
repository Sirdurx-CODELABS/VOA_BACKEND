const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, default: '' },
  morning: { type: Boolean, default: false },
  afternoon: { type: Boolean, default: false },
  evening: { type: Boolean, default: false },
  night: { type: Boolean, default: false },
  duration: { type: Number, default: 1 },
  durationUnit: { type: String, enum: ['days', 'weeks', 'months'], default: 'days' },
  instructions: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', required: true },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  medications: [medicationSchema],
  notes: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  isSent: { type: Boolean, default: false },
}, { timestamps: true });

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1 });

module.exports = mongoose.model('EMRPrescription', prescriptionSchema);
