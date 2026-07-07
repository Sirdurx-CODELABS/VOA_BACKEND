/**
 * ConversationCache — In-memory cache for FAQ responses and conversation context.
 * Reduces API calls for common questions and maintains context across messages.
 */

const logger = require('../../utils/logger');

const CACHE_TTL = {
  FAQ: 24 * 60 * 60 * 1000,       // 24 hours
  CONTEXT: 30 * 60 * 1000,         // 30 minutes
  SUMMARY: 2 * 60 * 60 * 1000,     // 2 hours
};

class ConversationCache {
  constructor() {
    this.faqCache = new Map();
    this.contextCache = new Map();
    this.summaryCache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cached FAQ response if available
   */
  getFAQ(query) {
    const key = this.normalizeKey(query);
    const entry = this.faqCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL.FAQ) {
      this.hits++;
      return entry.response;
    }
    this.misses++;
    return null;
  }

  /**
   * Cache an FAQ response
   */
  setFAQ(query, response) {
    const key = this.normalizeKey(query);
    this.faqCache.set(key, { response, timestamp: Date.now() });
    // Keep cache bounded
    if (this.faqCache.size > 1000) {
      const oldest = this.faqCache.keys().next().value;
      this.faqCache.delete(oldest);
    }
  }

  /**
   * Check if query is a likely FAQ (common health questions)
   */
  isLikelyFAQ(query) {
    const lower = query.toLowerCase().trim();
    // Short queries or common question patterns
    if (lower.length < 80 && (
      /^(what|how|when|where|why|can|should|is|are|do|does|tell)\b/.test(lower) ||
      /\b(meaning|definition|cause|symptom|treatment|prevent|side effect|sign)\b/.test(lower)
    )) return true;
    return false;
  }

  /**
   * Get/set conversation context for a patient
   */
  getContext(patientId) {
    const entry = this.contextCache.get(patientId);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL.CONTEXT) {
      return entry.context;
    }
    return null;
  }

  setContext(patientId, context) {
    this.contextCache.set(patientId, {
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Get/set cached summary
   */
  getSummary(chatId) {
    const entry = this.summaryCache.get(chatId);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL.SUMMARY) {
      return entry.summary;
    }
    return null;
  }

  setSummary(chatId, summary) {
    this.summaryCache.set(chatId, {
      summary,
      timestamp: Date.now(),
    });
  }

  normalizeKey(query) {
    return query.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  getStats() {
    return {
      faqEntries: this.faqCache.size,
      contextEntries: this.contextCache.size,
      summaryEntries: this.summaryCache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  clear() {
    this.faqCache.clear();
    this.contextCache.clear();
    this.summaryCache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('ConversationCache cleared');
  }
}

// Singleton
module.exports = new ConversationCache();
