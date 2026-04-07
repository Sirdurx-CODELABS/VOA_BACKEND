const mongoose = require('mongoose');

const activityParticipantSchema = new mongoose.Schema({
  activityId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteStatus:     { type: String, enum: ['invited', 'removed'], default: 'invited' },
  responseStatus:   { type: String, enum: ['pending', 'accepted', 'declined', 'absent'], default: 'pending' },
  responseReason:   { type: String, default: '' },
  attendanceStatus: { type: String, enum: ['pending', 'present', 'absent'], default: 'pending' },
  attendanceReason: { type: String, default: '' },
  invitedAt:        { type: Date, default: Date.now },
  respondedAt:      { type: Date, default: null },
}, { timestamps: true });

activityParticipantSchema.index({ activityId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ActivityParticipant', activityParticipantSchema);
