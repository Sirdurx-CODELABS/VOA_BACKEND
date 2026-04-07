const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title:              { type: String, required: true, trim: true },
  type:               { type: String, required: true, enum: [
    'meeting', 'event', 'community_outreach', 'community_visit', 'welfare_visit',
    'health_awareness', 'training', 'workshop', 'field_activity', 'other',
  ]},
  description:        { type: String, trim: true, default: '' },
  date:               { type: Date, required: true },
  startTime:          { type: String, default: '' },
  endTime:            { type: String, default: '' },
  venue:              { type: String, trim: true, default: '' },
  peopleNeeded:       { type: Number, default: 0 },
  targetMembershipType: { type: String, enum: ['adolescent', 'adult', 'parent_guardian', 'all'], default: 'all' },
  targetGender:       { type: String, enum: ['male', 'female', 'all'], default: 'all' },
  targetAgeMin:       { type: Number, default: null },
  targetAgeMax:       { type: Number, default: null },
  customConditions:   { type: String, default: '' },
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:             { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'], default: 'published' },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
