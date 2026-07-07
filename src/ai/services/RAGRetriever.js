const vectorStore = require('./VectorStore');
const EmbeddingService = require('./EmbeddingService');
const logger = require('../../utils/logger');

class RAGRetriever {
  constructor(embeddingService) {
    this.embeddingService = embeddingService;
  }

  async retrieve(query, options = {}) {
    const {
      topics = [],
      topK = 5,
      minScore = 0.3,
    } = options;

    if (!query || !query.trim()) return [];

    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      let results = [];
      if (topics.length > 0) {
        for (const topic of topics) {
          const topicResults = await vectorStore.search(queryEmbedding, {
            topic,
            topK: Math.ceil(topK / topics.length),
            minScore,
          });
          results.push(...topicResults);
        }
      } else {
        results = await vectorStore.search(queryEmbedding, { topK, minScore });
      }

      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, topK);

      if (results.length > 0) {
        logger.info(`RAGRetriever: found ${results.length} chunks for "${query.substring(0, 50)}..." (topics: ${topics.join(', ') || 'all'})`);
      }

      return results;
    } catch (err) {
      logger.warn(`RAGRetriever: retrieval failed: ${err.message}`);
      return [];
    }
  }

  formatContext(chunks) {
    if (!chunks || chunks.length === 0) return '';
    return chunks.map((c, i) =>
      `[Source: ${c.filename} (relevance: ${(c.score * 100).toFixed(0)}%)]\n${c.content}`
    ).join('\n\n');
  }
}

module.exports = RAGRetriever;
