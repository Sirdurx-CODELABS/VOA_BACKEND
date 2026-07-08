const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  role: { type: String, default: null },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  type: {
    type: String,
    enum: [
      'triage_pending', 'triage_completed', 'vitals_recorded',
      'prescription_pending', 'prescription_dispensed', 'prescription_cancelled',
      'lab_requested', 'sample_collected', 'lab_result_uploaded', 'lab_critical_flagged',
      'counseling_session_scheduled', 'case_assigned', 'case_updated',
      'referral_sent', 'referral_received',
      'patient_escalated', 'appointment_reminder', 'system_alert',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', default: null },
  patientName: { type: String, default: '' },
  link: { type: String, default: '' },
  metadata: { type: Map, of: String, default: {} },
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ role: 1, read: 1, createdAt: -1 });
notificationSchema.index({ hospital: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('ClinicalNotification', notificationSchema);
