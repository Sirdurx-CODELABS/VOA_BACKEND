const mongoose = require('mongoose');

const CHANNEL_TYPES = ['whatsapp', 'facebook', 'telegram', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'website', 'other'];

const socialChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: CHANNEL_TYPES, required: true },
  identifier: { type: String, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
}, { timestamps: true });

module.exports = mongoose.model('SocialChannel', socialChannelSchema);
