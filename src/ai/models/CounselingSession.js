const mongoose = require('mongoose');

const counselingSessionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  counselor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  type: {
    type: String,
    enum: ['adherence', 'enhanced_adherence', 'disclosure', 'education', 'psychosocial', 'prevention', 'treatment_literacy', 'other'],
    default: 'adherence',
  },
  sessionDate: { type: Date, default: Date.now },
  duration: Number,
  topic: String,
  notes: String,
  adherenceScore: { type: Number, min: 0, max: 100 },
  postAdherenceScore: { type: Number, min: 0, max: 100 },
  pillCount: Number,
  missedDoses: { type: Number, default: 0 },
  missedDosesSinceLastVisit: { type: Number, default: 0 },
  reasonsForMissedDoses: [String],
  actionPlan: String,
  followUpDate: Date,
  followUpCompleted: { type: Boolean, default: false },
  referralMade: { type: Boolean, default: false },
  referralDetails: String,
  outcome: {
    type: String,
    enum: ['improved', 'unchanged', 'worsened', 'lost', 'referred'],
  },
  aiRecommendations: {
    adherenceTrend: String,
    riskFactors: [String],
    suggestedTopics: [String],
    followUpInterval: String,
  },
  source: { type: String, enum: ['web', 'mobile'], default: 'web' },
}, {
  timestamps: true,
});

counselingSessionSchema.index({ patient: 1, createdAt: -1 });
counselingSessionSchema.index({ counselor: 1, createdAt: -1 });
counselingSessionSchema.index({ followUpDate: 1 }, { sparse: true });

module.exports = mongoose.model('CounselingSession', counselingSessionSchema);
