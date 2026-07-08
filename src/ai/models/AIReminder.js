const mongoose = require('mongoose');

const reminderActionSchema = new mongoose.Schema({
  action: { type: String, enum: ['taken', 'snoozed', 'skipped', 'need_help'], required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  source: { type: String, enum: ['web', 'whatsapp', 'mobile'], default: 'web' },
}, { _id: false });

const notificationLogSchema = new mongoose.Schema({
  channel: { type: String, enum: ['whatsapp', 'push', 'in_app', 'sms'], required: true },
  status: { type: String, enum: ['sent', 'delivered', 'failed', 'pending'], default: 'pending' },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  error: { type: String },
  providerMessageId: { type: String },
}, { _id: false });

const reminderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reminderType: {
    type: String,
    required: true,
    enum: [
      'medication', 'appointment', 'lab', 'refill', 'art_refill',
      'adherence_counselling', 'vaccination', 'health_check',
      'exercise', 'nutrition', 'water', 'sleep', 'mental_health',
      'daily_symptom', 'custom',
    ],
  },
  title: { type: String, required: true },
  description: { type: String },
  scheduledTime: { type: Date, required: true },
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], default: 'none' },
    interval: { type: Number, default: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    endDate: { type: Date },
  },
  channels: [{
    type: String,
    enum: ['whatsapp', 'push', 'in_app', 'sms'],
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'snoozed', 'completed', 'skipped', 'expired', 'cancelled'],
    default: 'pending',
  },
  actions: [reminderActionSchema],
  notificationLogs: [notificationLogSchema],
  snoozedUntil: { type: Date },
  snoozeCount: { type: Number, default: 0 },
  maxSnoozes: { type: Number, default: 3 },

  // Adherence tracking
  adherenceScore: { type: Number, min: 0, max: 100 },
  streak: { type: Number, default: 0 },
  lastActionAt: { type: Date },

  // Escalation
  escalationLevel: { type: Number, default: 0, min: 0, max: 3 },
  escalationHistory: [{
    escalatedTo: { type: String, enum: ['counselor', 'case_manager', 'doctor', 'hospital_admin'] },
    escalatedAt: { type: Date, default: Date.now },
    reason: { type: String },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],

  // Caregiver
  caregiverNotification: { type: Boolean, default: false },
  caregiverContacts: [{ type: String }],

  // AI-generated flag
  aiGenerated: { type: Boolean, default: false },
  aiContext: { type: mongoose.Schema.Types.Mixed },

  // Cross-platform
  lastNotifiedAt: { type: Date },
  nextScheduledAt: { type: Date },
}, {
  timestamps: true,
});

reminderSchema.index({ patient: 1, status: 1, scheduledTime: 1 });
reminderSchema.index({ hospital: 1, reminderType: 1 });
reminderSchema.index({ nextScheduledAt: 1, status: 1 });
reminderSchema.index({ 'escalationHistory.escalatedTo': 1, 'escalationHistory.resolved': 1 });

module.exports = mongoose.model('AIReminder', reminderSchema);
