const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', default: null },
  type: { type: String, enum: ['online', 'in-person'], default: 'in-person' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  notes: { type: String, default: '' },
  isWalkIn: { type: Boolean, default: false },
}, { timestamps: true });

appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ patient: 1 });

module.exports = mongoose.model('EMRAppointment', appointmentSchema);
