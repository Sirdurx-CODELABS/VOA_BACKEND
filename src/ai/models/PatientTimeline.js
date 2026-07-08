const mongoose = require('mongoose');

const patientTimelineSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  activityType: {
    type: String,
    required: true,
    enum: [
      'registration', 'vitals_recorded', 'triage_completed',
      'ai_risk_assessment', 'consultation_requested', 'consultation_accepted',
      'consultation_started', 'consultation_completed', 'consultation_cancelled',
      'prescription_created', 'prescription_reviewed', 'prescription_dispensed',
      'prescription_verified', 'prescription_cancelled',
      'lab_requested', 'sample_collected', 'lab_processing', 'lab_result_uploaded',
      'lab_result_verified', 'lab_critical_flagged',
      'referral_sent', 'referral_accepted', 'referral_completed', 'referral_declined',
      'counseling_session', 'adherence_review', 'adherence_score_updated',
      'case_opened', 'case_note_added', 'case_closed',
      'outreach_conducted', 'home_visit', 'community_visit',
      'appointment_scheduled', 'appointment_checked_in',
      'appointment_started', 'appointment_completed', 'appointment_cancelled',
      'medication_refilled', 'medication_administered',
      'ai_summary_generated', 'ai_recommendation_accepted',
      'ai_recommendation_rejected', 'ai_recommendation_modified',
      'patient_educated', 'consent_granted', 'consent_revoked',
      'hiv_viral_load_added', 'hiv_cd4_added', 'hiv_regimen_changed',
      'hiv_medication_added', 'hiv_oi_added',
      'message_sent', 'note_added', 'document_uploaded',
    ],
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByRole: { type: String },
  performedByName: { type: String },
  department: { type: String },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, enum: ['web', 'whatsapp', 'mobile', 'system', 'api'], default: 'web' },
  description: { type: String },
}, {
  timestamps: true,
});

patientTimelineSchema.index({ patient: 1, createdAt: -1 });
patientTimelineSchema.index({ patient: 1, activityType: 1 });
patientTimelineSchema.index({ hospital: 1, createdAt: -1 });
patientTimelineSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('PatientTimeline', patientTimelineSchema);
