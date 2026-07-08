const mongoose = require('mongoose');

const dispenseItemSchema = new mongoose.Schema({
  medicationName: { type: String, required: true },
  quantityDispensed: { type: Number, required: true },
  batchNumber: String,
  expiryDate: Date,
  instructions: String,
}, { _id: false });

const pharmacyDispenseSchema = new mongoose.Schema({
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'EMRPrescription', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital' },
  items: [dispenseItemSchema],
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'dispensed', 'partial', 'cancelled'],
    default: 'pending_review',
  },
  refillDate: Date,
  nextRefillDate: Date,
  counselingProvided: { type: Boolean, default: false },
  counselingNotes: String,
  verifiedAt: Date,
  dispensedAt: Date,
  stockDeducted: { type: Boolean, default: false },
  notes: String,
  source: { type: String, enum: ['web', 'mobile'], default: 'web' },
}, {
  timestamps: true,
});

pharmacyDispenseSchema.index({ status: 1, createdAt: -1 });
pharmacyDispenseSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('PharmacyDispense', pharmacyDispenseSchema);
