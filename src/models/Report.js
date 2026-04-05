const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: [{ type: String }], // file URLs
    type: { type: String, enum: ['meeting_minutes', 'event_report', 'general'], default: 'general' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
