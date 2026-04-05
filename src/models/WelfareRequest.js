const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  note: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now },
});

const welfareRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['financial', 'personal', 'other'], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in-progress', 'resolved'], default: 'pending' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    attachments: [{ type: String }],
    followUps: [followUpSchema],
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WelfareRequest', welfareRequestSchema);
