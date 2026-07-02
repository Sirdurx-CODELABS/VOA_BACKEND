const mongoose = require('mongoose');

const contributionMonthSchema = new mongoose.Schema({
  ledgerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContributionLedger',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // format: 'YYYY-MM'
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  requiredAmount: {
    type: Number,
    required: true,
    default: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    default: 0
  },
  outstandingAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'overpaid'],
    default: 'unpaid'
  },
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Installment'
  }]
}, {
  timestamps: true
});

// Indexes
contributionMonthSchema.index({ ledgerId: 1, month: 1 }, { unique: true });
contributionMonthSchema.index({ memberId: 1, month: 1 }, { unique: true });
contributionMonthSchema.index({ memberId: 1, year: 1 });
contributionMonthSchema.index({ status: 1 });

module.exports = mongoose.model('ContributionMonth', contributionMonthSchema);
