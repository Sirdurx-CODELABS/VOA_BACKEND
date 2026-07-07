const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
  filename: { type: String, required: true, trim: true },
  originalName: { type: String, default: '' },
  topic: { type: String, required: true, index: true },
  contentType: { type: String, enum: ['markdown', 'pdf', 'docx', 'txt', 'json'], default: 'markdown' },
  chunkIndex: { type: Number, default: 0 },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  metadata: {
    source: { type: String, default: '' },
    page: { type: Number, default: null },
    wordCount: { type: Number, default: 0 },
    language: { type: String, default: 'en' },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

knowledgeSchema.index({ topic: 1, chunkIndex: 1 });
knowledgeSchema.index({ filename: 1 });
knowledgeSchema.index({ isActive: 1 });

module.exports = mongoose.model('AIKnowledge', knowledgeSchema);
