const mongoose = require('mongoose');

const positionApplicationSchema = new mongoose.Schema({
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentRole: { type: String, required: true },
  appliedPosition: { type: String, required: true },
  reasonStatement: { type: String, required: true },
  experience: { type: String },
  skills: [{ type: String }],
  availability: { type: String },
  supportingNote: { type: String },
  status: {
    type: String,
    enum: ['pending_membership_review', 'pending_chairman_approval', 'approved', 'rejected'],
    default: 'pending_membership_review',
  },
  // Membership Coordinator review
  membershipReviewBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  membershipReviewNote: { type: String },
  membershipReviewAt: { type: Date },
  // Chairman decision
  chairmanDecisionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chairmanDecisionNote: { type: String },
  chairmanDecisionAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PositionApplication', positionApplicationSchema);
