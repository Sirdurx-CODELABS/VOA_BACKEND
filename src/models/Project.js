const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    image: { type: String },
    images: [{ type: String }],
    category: { type: String, default: 'General' },
    status: { type: String, enum: ['planning', 'active', 'completed', 'on-hold'], default: 'planning' },
    startDate: { type: Date },
    endDate: { type: Date },
    budget: { type: Number },
    location: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: true },
    impact: { type: String },
    features: [{ type: String }],
    allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
