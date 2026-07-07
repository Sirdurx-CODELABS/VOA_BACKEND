const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', default: null },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'AIChat', default: null },
  type: { type: String, enum: ['online', 'in-person'], default: 'online' },
  status: {
    type: String,
    enum: ['pending', 'doctor_accepted', 'patient_confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  consentDataShare: { type: Boolean, default: false },
  consentSummaryShare: { type: Boolean, default: false },
  consentDataShareAt: { type: Date, default: null },
  consentSummaryShareAt: { type: Date, default: null },
  aiSummary: {
    symptoms: { type: String, default: '' },
    timeline: { type: String, default: '' },
    currentMedication: { type: String, default: '' },
    concerns: { type: String, default: '' },
    riskAssessment: { type: String, default: '' },
    recommendations: { type: String, default: '' },
  },
  doctorAcceptedAt: { type: Date, default: null },
  patientConfirmedAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: '' },
  notes: { type: String, default: '' },
  prescription: { type: String, default: '' },
  labRequests: { type: String, default: '' },
  source: { type: String, enum: ['whatsapp', 'web', 'mobile'], default: 'web' },
}, { timestamps: true });

consultationSchema.index({ patient: 1, status: 1 });
consultationSchema.index({ doctor: 1, status: 1 });

module.exports = mongoose.model('AIConsultation', consultationSchema);
