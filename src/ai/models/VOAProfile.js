const mongoose = require('mongoose');

const voaProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization' },
  membershipType: {
    type: String,
    enum: ['regular', 'life', 'honorary', 'associate'],
    default: 'regular',
  },
  membershipNumber: { type: String, trim: true },
  membershipStatus: {
    type: String,
    enum: ['active', 'suspended', 'expired', 'resigned'],
    default: 'active',
  },
  joinedAt: { type: Date },
  expiryDate: { type: Date },
  position: { type: String, trim: true },
  chapter: { type: String, trim: true },
  // Contact & Bio
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  occupation: { type: String, trim: true },
  bio: { type: String },
  photoUrl: { type: String },
  // VOA Member-specific AI persona
  aiPersona: {
    type: String,
    enum: ['general_patient', 'voa_member', 'healthcare_worker'],
    default: 'general_patient',
  },
  // Consent
  consentGiven: { type: Boolean, default: false },
  consentDate: { type: Date },
  dataSharingConsent: { type: Boolean, default: false },
  caregiverOptIn: { type: Boolean, default: false },
  caregiverContact: { type: String },
  // Metadata
  metadata: { type: Map, of: String, default: {} },
}, {
  timestamps: true,
});

voaProfileSchema.index({ organization: 1, membershipStatus: 1 });
voaProfileSchema.index({ membershipNumber: 1 }, { sparse: true });

module.exports = mongoose.model('VOAProfile', voaProfileSchema);
