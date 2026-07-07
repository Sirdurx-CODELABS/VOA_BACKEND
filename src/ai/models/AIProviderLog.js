const mongoose = require('mongoose');

const providerLogSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model: { type: String, default: '' },
  level: { type: Number, default: 0 },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIChat', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPatient', default: null },
  intent: { type: String, default: '' },
  riskLevel: { type: String, default: '' },
  doctorEscalation: { type: Boolean, default: false },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  latency: { type: Number, default: 0 },
  fallbackUsed: { type: Boolean, default: false },
  attemptedChain: [{ type: String }],
  error: { type: String, default: '' },
  status: { type: String, enum: ['success', 'error'], default: 'success' },
}, { timestamps: true });

providerLogSchema.index({ createdAt: -1 });
providerLogSchema.index({ provider: 1, createdAt: -1 });
providerLogSchema.index({ conversationId: 1 });
providerLogSchema.index({ status: 1 });

module.exports = mongoose.model('AIProviderLog', providerLogSchema);
