const mongoose = require('mongoose');

const interventionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['phone_call', 'home_visit', 'community_visit', 'counseling', 'transport_support',
           'food_support', 'referral', 'linkage', 'disclosure_support', 'school_visit', 'other'],
    required: true,
  },
  date: { type: Date, default: Date.now },
  notes: String,
  outcome: String,
  conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration: Number,
  location: String,
}, { _id: false });

const caseRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  caseManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  openedAt: { type: Date, default: Date.now },
  closedAt: Date,
  status: {
    type: String,
    enum: ['open', 'monitoring', 'closed'],
    default: 'open',
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'moderate',
  },
  category: {
    type: String,
    enum: ['adherence', 'missed_appointments', 'social_support', 'disclosure',
           'mental_health', 'tb', 'pregnancy', 'adolescent', 'lost_to_followup', 'other'],
  },
  interventions: [interventionSchema],
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EMRReferral' }],
  missedAppointments: { type: Number, default: 0 },
  lastContactDate: Date,
  nextFollowUpDate: Date,
  closureReason: String,
  closureNotes: String,
  notes: String,
  source: { type: String, enum: ['web', 'mobile'], default: 'web' },
}, {
  timestamps: true,
});

caseRecordSchema.index({ status: 1, riskLevel: 1 });
caseRecordSchema.index({ caseManager: 1, status: 1 });
caseRecordSchema.index({ nextFollowUpDate: 1 }, { sparse: true });
caseRecordSchema.index({ patient: 1 }, { unique: true });

module.exports = mongoose.model('CaseRecord', caseRecordSchema);
