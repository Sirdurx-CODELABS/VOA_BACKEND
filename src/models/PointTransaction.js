const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        {
    type: String,
    enum: ['registration_bonus', 'early_contributor_bonus', 'contribution_base', 'contribution_extra', 'engagement'],
    required: true,
  },
  source:      { type: String, default: '' },   // human-readable description
  points:      { type: Number, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, // contribution/program id
}, { timestamps: true });

pointTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PointTransaction', pointTransactionSchema);
