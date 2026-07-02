const mongoose = require('mongoose');

const templateConfigSchema = new mongoose.Schema({
  templateType: {
    type: String,
    required: true,
    unique: true,
    enum: ['letterhead', 'membership_card', 'meeting_agenda', 'official_invitation',
           'financial_request', 'activity_report', 'official_receipt', 'mou',
           'email_signature', 'certificate']
  },
  name: { type: String, required: true },
  isVisible: { type: Boolean, default: true },
  allowedRoles: [{ type: String, enum: ['super_admin', 'chairman', 'vice_chairman', 'secretary',
    'treasurer', 'pro', 'program_coordinator', 'membership_coordinator', 'welfare_officer', 'member'] }],
}, { timestamps: true });

module.exports = mongoose.model('TemplateConfig', templateConfigSchema);
