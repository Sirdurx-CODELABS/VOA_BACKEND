const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['new_consultation', 'new_booking', 'cancelled_appointment', 'ai_alert', 'emergency_referral', 'lab_result', 'message'],
    required: true,
  },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' },
  relatedId: { type: String, default: '' },
  relatedModel: { type: String, default: '' },
}, { timestamps: true });

notificationSchema.index({ doctor: 1, isRead: 1 });
notificationSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model('EMRNotification', notificationSchema);
