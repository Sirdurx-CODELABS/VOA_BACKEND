const conversationCache = require('../services/ConversationCache');

describe('ConversationCache', () => {
  beforeEach(() => {
    conversationCache.clear();
  });

  describe('FAQ caching', () => {
    test('stores and retrieves FAQ responses', () => {
      conversationCache.setFAQ('What is HIV?', 'HIV is a virus...');
      const result = conversationCache.getFAQ('What is HIV?');
      expect(result).toBe('HIV is a virus...');
    });

    test('case insensitive matching', () => {
      conversationCache.setFAQ('What is HIV?', 'HIV info');
      expect(conversationCache.getFAQ('WHAT IS HIV?')).toBe('HIV info');
      expect(conversationCache.getFAQ('what is hiv?')).toBe('HIV info');
    });

    test('returns null for uncached queries', () => {
      expect(conversationCache.getFAQ('Unknown query')).toBeNull();
    });

    test('identifies likely FAQ patterns', () => {
      expect(conversationCache.isLikelyFAQ('What is HIV?')).toBe(true);
      expect(conversationCache.isLikelyFAQ('How is TB treated?')).toBe(true);
      expect(conversationCache.isLikelyFAQ('Tell me about ART side effects')).toBe(true);
      expect(conversationCache.isLikelyFAQ('I have a fever and cough')).toBe(false);
    });
  });

  describe('context caching', () => {
    test('stores and retrieves patient context', () => {
      const ctx = { level: 2, lastIntent: 'medication' };
      conversationCache.setContext('patient123', ctx);
      expect(conversationCache.getContext('patient123')).toEqual(ctx);
    });

    test('returns null for unknown patients', () => {
      expect(conversationCache.getContext('unknown')).toBeNull();
    });
  });

  describe('stats', () => {
    test('tracks hit/miss ratio', () => {
      conversationCache.setFAQ('Q', 'A');
      conversationCache.getFAQ('Q'); // hit
      conversationCache.getFAQ('X'); // miss
      const stats = conversationCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.faqEntries).toBe(1);
    });
  });
});
