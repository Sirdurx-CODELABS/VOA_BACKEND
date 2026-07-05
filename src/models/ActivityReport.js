const mongoose = require('mongoose');

const activityReportSchema = new mongoose.Schema({
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  reportType: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [{ type: String }],
  allianceOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AllianceOrganization', default: null },
}, { timestamps: true });

module.exports = mongoose.model('ActivityReport', activityReportSchema);
