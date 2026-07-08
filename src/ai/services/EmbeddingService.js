const logger = require('../../utils/logger');

class EmbeddingService {
  constructor(providers = {}) {
    this.providers = providers;
  }

  async generateEmbedding(text, options = {}) {
    const preferred = options.provider || 'gemini';
    const providerOrder = [preferred, 'openai', 'gemini', 'huggingface'];

    for (const name of providerOrder) {
      const provider = this.providers[name];
      if (!provider || !provider.isAvailable()) continue;
      try {
        if (typeof provider.generateEmbedding !== 'function') continue;
        const result = await provider.generateEmbedding(text);
        if (result && result.embedding && result.embedding.length > 0) {
          return result.embedding;
        }
      } catch (err) {
        logger.debug(`EmbeddingService: ${name} failed: ${err.message}`);
      }
    }

    throw new Error('No embedding provider available');
  }

  async generateEmbeddings(texts, options = {}) {
    return Promise.all(texts.map(t => this.generateEmbedding(t, options)));
  }

  chunkText(text, options = {}) {
    const { maxChunkSize = 500, overlap = 50 } = options;
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += maxChunkSize - overlap) {
      const chunk = words.slice(i, i + maxChunkSize);
      if (chunk.length > 0) {
        chunks.push(chunk.join(' '));
      }
    }

    return chunks;
  }
}

module.exports = EmbeddingService;
