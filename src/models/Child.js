const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  parentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childName:    { type: String, required: true, trim: true },
  childDob:     { type: Date, required: true },
  childGender:  { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  relationship: { type: String, enum: ['son', 'daughter', 'ward', 'other'], default: 'other' },
  hasAccount:   { type: Boolean, default: false },
  linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual: child age from DOB
childSchema.virtual('childAge').get(function () {
  if (!this.childDob) return null;
  const today = new Date();
  const birth = new Date(this.childDob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

module.exports = mongoose.model('Child', childSchema);
