const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  state: { type: String, required: true, trim: true },
  lga: { type: String, required: true, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  openingHours: { type: String, default: '' },
  services: [{ type: String, trim: true }],
  hasHivServices: { type: Boolean, default: false },
  hasTbServices: { type: Boolean, default: false },
  hasArtServices: { type: Boolean, default: false },
  hasEmergency: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String, default: {} },
}, { timestamps: true });

hospitalSchema.index({ state: 1, lga: 1 });
hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ services: 1 });

module.exports = mongoose.model('AIHospital', hospitalSchema);
