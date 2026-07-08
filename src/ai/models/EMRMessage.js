const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel', required: true },
  senderModel: { type: String, enum: ['AIDoctor', 'AIPatient', 'User', 'AIHospital'], required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, refPath: 'recipientModel', required: true },
  recipientModel: { type: String, enum: ['AIDoctor', 'AIPatient', 'User', 'AIHospital'], required: true },
  senderRole: { type: String, enum: ['doctor', 'patient', 'admin', 'hospital'], required: true },
  recipientRole: { type: String, enum: ['doctor', 'patient', 'admin', 'hospital'], required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ consultation: 1 });

module.exports = mongoose.model('EMRMessage', messageSchema);
