const mongoose = require('mongoose');

const documentApprovalSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentTemplate', required: true },
    templateType: { type: String, required: true },
    role: { type: String, required: true },
    label: { type: String, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    signatureUrl: { type: String, default: null },
    comment: { type: String, default: null },
    actionedAt: { type: Date, default: null },
    allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentApproval', documentApprovalSchema);
