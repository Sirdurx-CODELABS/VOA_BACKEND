const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['event_reminder', 'inactivity_alert', 'assignment', 'announcement', 'welfare', 'general'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: null }, // optional deep link
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedModel: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
