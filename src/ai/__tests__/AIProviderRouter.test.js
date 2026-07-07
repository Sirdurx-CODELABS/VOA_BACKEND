const AIProviderRouter = require('../services/AIProviderRouter');

describe('AIProviderRouter', () => {
  let router;

  beforeEach(() => {
    router = new AIProviderRouter({
      groq: { isAvailable: () => true, name: 'groq', generateResponse: jest.fn() },
      gemini: { isAvailable: () => true, name: 'gemini', generateResponse: jest.fn() },
      openai: { isAvailable: () => true, name: 'openai', generateResponse: jest.fn() },
      claude: { isAvailable: () => false, name: 'claude' },
      huggingface: { isAvailable: () => false, name: 'huggingface' },
    });
  });

  describe('classifyLevel', () => {
    test('returns 1 for greetings', () => {
      expect(router.classifyLevel('Hello')).toBe(1);
      expect(router.classifyLevel('Hi, how are you?')).toBe(1);
      expect(router.classifyLevel('Good morning')).toBe(1);
    });

    test('returns 2 for health topics', () => {
      expect(router.classifyLevel('Tell me about HIV prevention')).toBe(2);
      expect(router.classifyLevel('What is TB?')).toBe(2);
      expect(router.classifyLevel('I have a fever')).toBe(2);
    });

    test('returns 3 for summarization requests', () => {
      expect(router.classifyLevel('Can you summarize what we discussed?')).toBe(3);
    });

    test('returns 4 for complex risk assessment', () => {
      const result = router.classifyLevel('I have persistent severe chest pain', {
        diagnosis: { hiv: true },
        currentDrugs: 'TLD',
      });
      expect(result).toBe(4);
    });

    test('returns 5 for emotional support', () => {
      const history = Array(15).fill({ sender: 'patient', message: 'test' });
      const result = router.classifyLevel('I feel very depressed and anxious', {}, history);
      expect(result).toBe(5);
    });
  });

  describe('getLevelProviders', () => {
    test('level 1 uses groq', () => {
      expect(router.getLevelProviders(1)).toEqual(['groq']);
    });
    test('level 2 uses groq then gemini', () => {
      expect(router.getLevelProviders(2)).toEqual(['groq', 'gemini']);
    });
    test('level 3 uses gemini', () => {
      expect(router.getLevelProviders(3)).toEqual(['gemini']);
    });
    test('level 4 uses openai then claude', () => {
      expect(router.getLevelProviders(4)).toEqual(['openai', 'claude']);
    });
    test('level 5 uses claude then openai', () => {
      expect(router.getLevelProviders(5)).toEqual(['claude', 'openai']);
    });
  });

  describe('getAvailable', () => {
    test('returns first available provider', () => {
      const p = router.getAvailable(['groq', 'gemini']);
      expect(p.name).toBe('groq');
    });

    test('skips providers in cooldown', () => {
      router.cooldowns.groq = Date.now() + 60000;
      const p = router.getAvailable(['groq', 'gemini']);
      expect(p.name).toBe('gemini');
    });

    test('returns null if all in cooldown', () => {
      router.cooldowns.groq = Date.now() + 60000;
      router.cooldowns.gemini = Date.now() + 60000;
      const p = router.getAvailable(['groq', 'gemini']);
      expect(p).toBeNull();
    });

    test('returns null if no configured providers', () => {
      const r = new AIProviderRouter({});
      expect(r.getAvailable(['groq'])).toBeNull();
    });
  });

  describe('isRateLimitError', () => {
    test('detects rate limit messages', () => {
      expect(router.isRateLimitError(new Error('Rate limit exceeded'))).toBe(true);
      expect(router.isRateLimitError(new Error('quota exhausted'))).toBe(true);
      expect(router.isRateLimitError(new Error('429 Too Many Requests'))).toBe(true);
      expect(router.isRateLimitError(new Error('Insufficient quota'))).toBe(true);
      expect(router.isRateLimitError(new Error('Credit balance exhausted'))).toBe(true);
    });

    test('does not falsely detect other errors', () => {
      expect(router.isRateLimitError(new Error('Server error'))).toBe(false);
      expect(router.isRateLimitError(new Error('Invalid API key'))).toBe(false);
      expect(router.isRateLimitError(new Error('Network timeout'))).toBe(false);
    });
  });

  describe('getConfiguredProviders', () => {
    test('returns only providers with API keys', () => {
      const names = router.getConfiguredProviders();
      expect(names).toContain('groq');
      expect(names).toContain('gemini');
      expect(names).toContain('openai');
      expect(names).not.toContain('claude');
      expect(names).not.toContain('huggingface');
    });
  });

  describe('route', () => {
    test('uses primary provider when available', async () => {
      router.providers.groq.generateResponse.mockResolvedValue({ content: 'Hello!' });

      const result = await router.route([{ role: 'user', content: 'Hi' }], { level: 1 });

      expect(result.content).toBe('Hello!');
      expect(result.provider).toBe('groq');
      expect(result.fallbackUsed).toBe(false);
    });

    test('falls back when primary fails', async () => {
      router.providers.groq.generateResponse.mockRejectedValue(new Error('Server error'));
      router.providers.gemini.generateResponse.mockResolvedValue({ content: 'Hello from fallback' });

      const result = await router.route([{ role: 'user', content: 'Hi' }], { level: 2 });

      expect(result.content).toBe('Hello from fallback');
      expect(result.provider).toBe('gemini');
      expect(result.fallbackUsed).toBe(true);
    });

    test('rate-limited provider goes into cooldown and fallback is used', async () => {
      router.providers.groq.generateResponse.mockRejectedValue(new Error('Rate limit exceeded'));
      router.providers.gemini.generateResponse.mockResolvedValue({ content: 'Fallback after rate limit' });

      const result = await router.route([{ role: 'user', content: 'Hi' }], { level: 2 });

      expect(result.content).toBe('Fallback after rate limit');
      expect(result.provider).toBe('gemini');
      expect(router.cooldowns.groq).toBeGreaterThan(Date.now());
    });

    test('cooldown provider is skipped on subsequent calls', async () => {
      router.cooldowns.groq = Date.now() + 60000;
      router.providers.gemini.generateResponse.mockResolvedValue({ content: 'Skipped cooldown' });

      const result = await router.route([{ role: 'user', content: 'Hi' }], { level: 1 });

      expect(result.provider).toBe('gemini');
      expect(router.providers.groq.generateResponse).not.toHaveBeenCalled();
    });

    test('throws when all configured providers fail', async () => {
      router.providers.groq.generateResponse.mockRejectedValue(new Error('Error'));
      router.providers.gemini.generateResponse.mockRejectedValue(new Error('Error'));
      delete router.providers.openai;

      await expect(
        router.route([{ role: 'user', content: 'Hi' }], { level: 2 })
      ).rejects.toThrow('All AI providers unavailable');
    });

    test('skips unconfigured providers without error', async () => {
      delete router.providers.groq;
      delete router.providers.openai;
      router.providers.gemini.generateResponse.mockResolvedValue({ content: 'Only gemini works' });

      const result = await router.route([{ role: 'user', content: 'Hi' }], { level: 1 });

      expect(result.provider).toBe('gemini');
    });
  });

  describe('clearCooldowns', () => {
    test('clears all cooldowns', () => {
      router.cooldowns.groq = Date.now() + 60000;
      router.cooldowns.gemini = Date.now() + 60000;
      router.clearCooldowns();
      expect(Object.keys(router.cooldowns).length).toBe(0);
    });
  });
});
