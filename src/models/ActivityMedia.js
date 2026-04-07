const mongoose = require('mongoose');
const crypto = require('crypto');

const activityMediaSchema = new mongoose.Schema({
  activityId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl:    { type: String, required: true },
  caption:     { type: String, default: '' },
  shareToken:  { type: String, unique: true, default: () => crypto.randomBytes(16).toString('hex') },
}, { timestamps: true });

module.exports = mongoose.model('ActivityMedia', activityMediaSchema);
