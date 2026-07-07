const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['patient', 'ai', 'doctor'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const chatSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', required: true },
  messages: [messageSchema],
  intent: { type: String, default: '' },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'emergency'], default: 'low' },
  aiRecommendation: { type: String, default: '' },
  escalated: { type: Boolean, default: false },
  escalationReason: { type: String, default: '' },
  doctorAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'AIDoctor', default: null },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConsultation', default: null },
  status: { type: String, enum: ['active', 'resolved', 'escalated'], default: 'active' },
  channel: { type: String, enum: ['whatsapp', 'web', 'mobile'], default: 'web' },
  metadata: { type: Map, of: String, default: {} },
}, { timestamps: true });

chatSchema.index({ patient: 1, createdAt: -1 });
chatSchema.index({ status: 1 });
chatSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('AIChat', chatSchema);
