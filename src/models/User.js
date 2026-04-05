const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, getPermissions } = require('../config/permissions');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: 'member' },
    isVice: { type: Boolean, default: false },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    engagementScore: { type: Number, default: 0 },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastActiveAt: { type: Date, default: Date.now },
    profileImage: { type: String, default: null },
    bio: { type: String, maxlength: 300, default: '' },
    state: { type: String, default: '' },
    address: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    points: { type: Number, default: 0 },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: computed permissions based on role + isVice
userSchema.virtual('permissions').get(function () {
  return getPermissions(this.role, this.isVice);
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function (permission) {
  if (this.role === 'super_admin') return true;
  const perms = getPermissions(this.role, this.isVice);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
};

userSchema.methods.updateActivity = function () {
  this.lastActiveAt = new Date();
  return this.save({ validateBeforeSave: false });
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
