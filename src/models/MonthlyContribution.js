const mongoose = require('mongoose');

/**
 * Tracks a member's monthly contribution progress.
 * One record per user per month. Installments accumulate here.
 */
const monthlyContributionSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month:             { type: String, required: true },   // "2026-04"
  year:              { type: Number, required: true },
  requiredAmount:    { type: Number, required: true, default: 0 },
  amountPaid:        { type: Number, default: 0 },
  extraAmount:       { type: Number, default: 0 },       // paid above required
  isCompleted:       { type: Boolean, default: false },
  completedAt:       { type: Date, default: null },
  calculationSource: { type: String, default: 'auto' },  // 'adolescent' | 'adult' | 'parent_children'
  breakdown:         [{ type: mongoose.Schema.Types.Mixed }], // child breakdown for parents
  targetId:          { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceTarget', default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

monthlyContributionSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.requiredAmount - this.amountPaid);
});

monthlyContributionSchema.virtual('progressPercent').get(function () {
  if (this.requiredAmount === 0) return 100;
  return Math.min(100, Math.round((this.amountPaid / this.requiredAmount) * 100));
});

// Unique per user per month
monthlyContributionSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyContribution', monthlyContributionSchema);
