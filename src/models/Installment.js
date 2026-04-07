const mongoose = require('mongoose');

/**
 * Individual payment installment toward a monthly contribution.
 */
const installmentSchema = new mongoose.Schema({
  userId:                   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monthlyContributionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyContribution', required: true },
  month:                    { type: String, required: true },
  amount:                   { type: Number, required: true, min: 1 },
  paymentMode:              { type: String, enum: ['required', 'custom', 'installment'], default: 'required' },
  paymentMethod:            { type: String, enum: ['bank_transfer', 'cash', 'other'], default: 'bank_transfer' },
  referenceNote:            { type: String, default: '' },
  proofImage:               { type: String, default: null },
  accountId:                { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', default: null },
  targetId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceTarget', default: null },
  status:                   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:               { type: Date, default: null },
  rejectionReason:          { type: String, default: '' },
  receiptNumber:            { type: String, default: null },
  pointsAwarded:            { type: Number, default: 0 },
  isExtraPayment:           { type: Boolean, default: false },
  calculatedDueAtSubmission:{ type: Number, default: 0 }, // snapshot of required amount at time of payment
}, { timestamps: true });

module.exports = mongoose.model('Installment', installmentSchema);
