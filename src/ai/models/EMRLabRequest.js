const mongoose = require('mongoose');

const testItemSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  category: {
    type: String,
    enum: ['viral_load', 'cd4', 'fbc', 'lft', 'rft', 'genexpert', 'malaria', 'pregnancy', 'urinalysis', 'custom'],
    default: 'custom',
  },
  notes: { type: String, default: '' },
  isUrgent: { type: Boolean, default: false },
}, { _id: false });

const labRequestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', required: true },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  tests: [testItemSchema],
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['requested', 'sample_collected', 'processing', 'completed', 'cancelled'],
    default: 'requested',
  },
  result: { type: String, default: '' },
  resultDate: { type: Date, default: null },
}, { timestamps: true });

labRequestSchema.index({ patient: 1, createdAt: -1 });
labRequestSchema.index({ doctor: 1 });
labRequestSchema.index({ status: 1 });

module.exports = mongoose.model('EMRLabRequest', labRequestSchema);
