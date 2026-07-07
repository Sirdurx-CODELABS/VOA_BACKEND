const AIKnowledge = require('../models/AIKnowledge');
const logger = require('../../utils/logger');

class VectorStore {
  constructor() {
    this.initialized = true;
    logger.info('VectorStore initialized (MongoDB-backed)');
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  async store(chunks) {
    if (!chunks || chunks.length === 0) return [];
    const docs = await AIKnowledge.insertMany(chunks);
    logger.info(`VectorStore: stored ${docs.length} chunks`);
    return docs;
  }

  async search(queryEmbedding, options = {}) {
    const { topic, topK = 5, minScore = 0.3 } = options;
    const filter = { isActive: true, embedding: { $ne: [] } };
    if (topic) filter.topic = topic;

    const candidates = await AIKnowledge.find(filter).lean();
    if (candidates.length === 0) return [];

    const scored = candidates.map(c => ({
      ...c,
      score: this.cosineSimilarity(queryEmbedding, c.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.filter(c => c.score >= minScore).slice(0, topK);
  }

  async getByTopic(topic) {
    return AIKnowledge.find({ topic, isActive: true }).sort({ chunkIndex: 1 }).lean();
  }

  async getTopics() {
    return AIKnowledge.distinct('topic', { isActive: true });
  }

  async count() {
    return AIKnowledge.countDocuments({ isActive: true });
  }

  async removeByFilename(filename) {
    return AIKnowledge.deleteMany({ filename });
  }

  async clearAll() {
    return AIKnowledge.deleteMany({});
  }
}

module.exports = new VectorStore();
