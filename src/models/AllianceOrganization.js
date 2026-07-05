const mongoose = require('mongoose');

const orgSchema = new mongoose.Schema({
  organizationName: { type: String, required: true, trim: true },
  shortName: { type: String, trim: true, default: '' },
  logo: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#1E3A8A' },
  secondaryColor: { type: String, default: '#F97316' },
  accentColor: { type: String, default: '#22C55E' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'Nigeria' },
  facilityType: { type: String, default: '' },
  organizationType: {
    type: String,
    enum: ['hospital', 'ngo', 'support_group', 'adolescent_club', 'community_organization', 'government', 'educational', 'other'],
    default: 'ngo',
  },
  address: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  website: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending'], default: 'active' },
  systemInfo: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    website: { type: String, default: '' },
    socialMedia: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      tiktok: { type: String, default: '' },
    },
  },
}, { timestamps: true });

orgSchema.index({ organizationName: 1 });
orgSchema.index({ status: 1 });

module.exports = mongoose.model('AllianceOrganization', orgSchema);
