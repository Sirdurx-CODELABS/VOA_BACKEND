const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    time: { type: String },
    location: { type: String, required: true },
    category: { type: String, default: 'General' },
    image: { type: String },
    images: [{ type: String }],
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
    seats: { type: Number },
    registered: { type: Number, default: 0 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: true },
    allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
