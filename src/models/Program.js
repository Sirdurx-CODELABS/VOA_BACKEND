const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    images: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String },
        message: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    date: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    budget: { type: Number, default: 0 },
    venue: { type: String, trim: true },
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Program', programSchema);
