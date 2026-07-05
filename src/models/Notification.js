const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['event_reminder', 'inactivity_alert', 'announcement', 'welfare', 'achievement', 'general'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedModel: { type: String, default: null },
    allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
