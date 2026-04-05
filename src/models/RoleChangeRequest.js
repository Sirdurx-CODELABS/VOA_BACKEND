const mongoose = require('mongoose');

const roleChangeRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedRole: { type: String, required: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending_chairman', 'approved', 'rejected'],
    default: 'pending_chairman',
  },
  membershipCoordinatorApproved: { type: Boolean, default: false },
  chairmanApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RoleChangeRequest', roleChangeRequestSchema);
