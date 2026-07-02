const mongoose = require('mongoose');

const targetAllocationSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Installment',
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceTarget',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  allocatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
targetAllocationSchema.index({ paymentId: 1 });
targetAllocationSchema.index({ targetId: 1 });
targetAllocationSchema.index({ allocatedBy: 1 });

module.exports = mongoose.model('TargetAllocation', targetAllocationSchema);
