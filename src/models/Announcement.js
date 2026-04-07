const mongoose = require('mongoose');

const CATEGORIES = [
  'executive', 'emergency', 'official', 'policy', 'leadership',
  'finance', 'contribution', 'payment_reminder', 'transparency', 'account_update',
  'meeting', 'report', 'documentation', 'attendance_reminder',
  'membership', 'reminder', 'onboarding', 'engagement', 'inactivity', 'role_application',
  'publicity', 'event', 'awareness', 'media', 'program',
  'volunteer', 'activity', 'participation_reminder',
  'welfare', 'support', 'care_notice',
  'general',
];

const announcementSchema = new mongoose.Schema({
  title:          { type: String, required: true, trim: true },
  message:        { type: String, required: true },
  category:       { type: String, enum: CATEGORIES, required: true, default: 'general' },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByRole:  { type: String, required: true },
  visibility:     { type: String, enum: ['internal', 'public', 'specific_roles'], default: 'internal' },
  targetRoles:    [{ type: String }],
  departmentTag:  { type: String, default: '' },
  status:         { type: String, enum: ['published', 'draft', 'archived'], default: 'published' },
  attachments:    [{ type: String }],
  isPinned:       { type: Boolean, default: false },
  expiresAt:      { type: Date, default: null },
}, { timestamps: true });

announcementSchema.statics.CATEGORIES = CATEGORIES;
module.exports = mongoose.model('Announcement', announcementSchema);
