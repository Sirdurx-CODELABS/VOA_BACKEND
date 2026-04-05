const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    status: { type: String, enum: ['present', 'absent'], required: true },
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate attendance records per user per program
attendanceSchema.index({ userId: 1, programId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
