const mongoose = require('mongoose');

const treasuryAccountSchema = new mongoose.Schema({
  accountName: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  accountHolderName: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('TreasuryAccount', treasuryAccountSchema);
