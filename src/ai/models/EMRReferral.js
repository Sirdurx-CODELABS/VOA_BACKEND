const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  fromDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', required: true },
  fromHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  toHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', required: true },
  reason: { type: String, required: true },
  priority: { type: String, enum: ['routine', 'urgent', 'emergency'], default: 'routine' },
  consultationSummary: { type: String, default: '' },
  aiSummary: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'declined'], default: 'pending' },
}, { timestamps: true });

referralSchema.index({ patient: 1, createdAt: -1 });
referralSchema.index({ fromDoctor: 1 });
referralSchema.index({ toHospital: 1, status: 1 });

module.exports = mongoose.model('EMRReferral', referralSchema);
