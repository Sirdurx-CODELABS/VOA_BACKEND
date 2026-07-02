const mongoose = require('mongoose');

const systemInfoSchema = new mongoose.Schema({
  email: { type: String, default: 'voiceofadolescence1@gmail.com' },
  phone: { type: String, default: '+234 8143705588' },
  website: { type: String, default: 'www.voiceofadolescent.org' },
  address: { type: String, default: 'SS.Wali Aminu Kano Teaching Hospitals, Kano State, Nigeria' },
  contactNumbers: [{ type: String }],
  socialMedia: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    tiktok: { type: String, default: '' },
  },
  documentSystemUrl: { type: String, default: 'http://localhost:5173' },
}, { timestamps: true });

module.exports = mongoose.model('SystemInfo', systemInfoSchema);
