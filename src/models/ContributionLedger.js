const mongoose = require('mongoose');

const contributionLedgerSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  membershipType: {
    type: String,
    enum: ['adolescent', 'adult', 'parent_guardian'],
    required: true
  },
  monthlyRequiredAmount: {
    type: Number,
    required: true,
    default: 0
  },
  totalPaid: {
    type: Number,
    required: true,
    default: 0
  },
  outstandingBalance: {
    type: Number,
    required: true,
    default: 0
  },
  arrears: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['fully_paid', 'partially_paid', 'outstanding', 'overpaid'],
    default: 'outstanding'
  },
  monthsPaid: {
    type: Number,
    required: true,
    default: 0
  },
  monthsOwing: {
    type: Number,
    required: true,
    default: 0
  },
  lastPaymentDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
contributionLedgerSchema.index({ status: 1 });
contributionLedgerSchema.index({ membershipType: 1 });

module.exports = mongoose.model('ContributionLedger', contributionLedgerSchema);
