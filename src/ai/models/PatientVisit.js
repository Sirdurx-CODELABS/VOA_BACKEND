const mongoose = require('mongoose');

const patientVisitSchema = new mongoose.Schema({
  patient:  { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

  status: {
    type: String,
    enum: [
      'checked_in', 'triaged', 'in_consultation',
      'lab_ordered', 'in_pharmacy', 'dispensed',
      'discharged', 'cancelled'
    ],
    default: 'checked_in',
  },

  checkedInBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  triagedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  attendedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  consultation:  { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  labRequests:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'EMRLabRequest' }],
  prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EMRPrescription' }],
  dispenses:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyDispense' }],
  referrals:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'EMRReferral' }],

  visitType: { type: String, enum: ['in-person', 'online'], default: 'in-person' },
  source:    { type: String, enum: ['reception', 'triage', 'appointment'], default: 'reception' },

  checkInTime:           { type: Date, default: null },
  triageTime:            { type: Date, default: null },
  consultationStartTime: { type: Date, default: null },
  consultationEndTime:   { type: Date, default: null },
  dischargeTime:         { type: Date, default: null },
  cancelledAt:           { type: Date, default: null },
  cancellationReason:    { type: String, default: '' },

  dischargeNotes: { type: String, default: '' },
  followUpDate:   { type: Date, default: null },
  followUpNotes:  { type: String, default: '' },
}, { timestamps: true });

patientVisitSchema.index({ patient: 1, createdAt: -1 });
patientVisitSchema.index({ status: 1, hospital: 1 });
patientVisitSchema.index({ attendedBy: 1, status: 1 });

module.exports = mongoose.model('PatientVisit', patientVisitSchema);
