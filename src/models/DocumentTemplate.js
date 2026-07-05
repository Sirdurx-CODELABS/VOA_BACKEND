const mongoose = require('mongoose');

const documentTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    templateType: {
      type: String,
      required: true,
      enum: [
        'letterhead', 'membership_card', 'meeting_agenda', 'official_invitation',
        'financial_request', 'activity_report', 'official_receipt', 'mou',
        'email_signature', 'certificate'
      ]
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    pdfUrl: { type: String, default: null },
    status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'rejected'], default: 'draft' },
    allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DocumentTemplate', documentTemplateSchema);
