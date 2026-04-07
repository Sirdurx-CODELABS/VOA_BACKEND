const mongoose = require('mongoose');

const financeTargetSchema = new mongoose.Schema({
  title:          { type: String, required: true, trim: true },
  description:    { type: String, default: '' },
  category:       {
    type: String,
    enum: ['event', 'welfare', 'project', 'office', 'outreach', 'emergency', 'equipment', 'general'],
    default: 'general',
  },
  targetAmount:   { type: Number, required: true, min: 1 },
  amountRaised:   { type: Number, default: 0 },
  startDate:      { type: Date, default: Date.now },
  deadline:       { type: Date, default: null },
  isCompleted:    { type: Boolean, default: false },
  completedAt:    { type: Date, default: null },
  isActive:       { type: Boolean, default: true },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtuals
financeTargetSchema.virtual('amountRemaining').get(function () {
  return Math.max(0, this.targetAmount - this.amountRaised);
});

financeTargetSchema.virtual('excessAmount').get(function () {
  return Math.max(0, this.amountRaised - this.targetAmount);
});

financeTargetSchema.virtual('progressPercent').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.amountRaised / this.targetAmount) * 100));
});

module.exports = mongoose.model('FinanceTarget', financeTargetSchema);
