const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  type: { type: String, enum: ['data_sharing', 'summary_sharing', 'terms_accepted', 'data_access'], required: true },
  granted: { type: Boolean, required: true },
  details: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  source: { type: String, enum: ['whatsapp', 'web', 'mobile', 'api'], default: 'api' },
  metadata: { type: Map, of: String, default: {} },
}, { timestamps: true });

consentLogSchema.index({ patient: 1, createdAt: -1 });
consentLogSchema.index({ consultation: 1 });

module.exports = mongoose.model('AIConsentLog', consentLogSchema);
