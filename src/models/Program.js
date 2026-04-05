const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    date: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    budget: { type: Number, default: 0 },
    venue: { type: String, trim: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Program', programSchema);
