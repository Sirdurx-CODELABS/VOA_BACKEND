const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  position: {
    type: String,
    required: true
  },
  bio: {
    type: String
  },
  photo: {
    type: String
  },
  order: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  allianceOrganizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllianceOrganization',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);
