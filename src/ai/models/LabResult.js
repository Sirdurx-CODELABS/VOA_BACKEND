const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  category: {
    type: String,
    enum: ['viral_load', 'cd4', 'fbc', 'lft', 'rft', 'genexpert', 'malaria', 'pregnancy', 'urinalysis', 'culture', 'serology', 'chemistry', 'custom'],
  },
  result: String,
  unit: String,
  referenceRange: String,
  isCritical: { type: Boolean, default: false },
  isAbnormal: { type: Boolean, default: false },
  flag: { type: String, enum: ['normal', 'high', 'low', 'critical_high', 'critical_low'] },
  performedAt: Date,
  notes: String,
}, { _id: false });

const labResultSchema = new mongoose.Schema({
  labRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'EMRLabRequest', index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  tests: [testResultSchema],
  sampleType: String,
  collectionDate: Date,
  receivedDate: Date,
  processedDate: Date,
  resultDate: Date,
  verifiedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'sample_collected', 'processing', 'completed', 'verified', 'cancelled'],
    default: 'pending',
  },
  hasCriticalResults: { type: Boolean, default: false },
  criticalFlags: [{ type: String }],
  notes: String,
}, {
  timestamps: true,
});

labResultSchema.index({ status: 1, createdAt: -1 });
labResultSchema.index({ patient: 1, createdAt: -1 });
labResultSchema.index({ hasCriticalResults: 1, status: 1 });

module.exports = mongoose.model('LabResult', labResultSchema);
