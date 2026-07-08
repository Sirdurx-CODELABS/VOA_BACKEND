const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  type: {
    type: String,
    enum: ['consultation', 'prescription', 'lab_result', 'referral', 'ai_summary', 'doctor_note', 'hospital_visit', 'risk_assessment'],
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  referenceId: { type: String, default: '' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', default: null },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

medicalRecordSchema.index({ patient: 1, createdAt: -1 });
medicalRecordSchema.index({ patient: 1, type: 1 });

module.exports = mongoose.model('EMRMedicalRecord', medicalRecordSchema);
