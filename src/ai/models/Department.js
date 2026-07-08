const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHospital', required: true },
  headOfDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  services: [{ type: String, trim: true }],
  location: String,
  extension: String,
  email: String,
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

departmentSchema.index({ hospital: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
