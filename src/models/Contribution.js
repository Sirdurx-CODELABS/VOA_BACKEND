const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  userId:                { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:                { type: Number, required: true, min: 0 },   // actual amount paid
  minimumRequiredAmount: { type: Number, required: true },            // minimum for their gender
  isAboveMinimum:        { type: Boolean, default: false },
  extraAmount:           { type: Number, default: 0 },               // amount - minimum
  month:                 { type: String, required: true },            // e.g. "2026-04"
  proofImage:            { type: String, default: null },
  paymentMethod:         { type: String, enum: ['bank_transfer', 'cash', 'other'], default: 'bank_transfer' },
  referenceNote:         { type: String, default: '' },
  accountId:             { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', default: null },
  targetId:              { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceTarget', default: null },
  status:                { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:            { type: Date, default: null },
  rejectionReason:       { type: String, default: '' },
  receiptNumber:         { type: String, default: null },
  pointsAwarded:         { type: Number, default: 0 },
}, { timestamps: true });

contributionSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Contribution', contributionSchema);
