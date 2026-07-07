/**
 * AIProviderRouter — Routes conversation to the correct AI provider
 * based on conversation complexity (Levels 1-5) with full fallback chain.
 *
 * Rules:
 *   - Only tries providers that are configured (have API keys)
 *   - Level-based primary preference, then full fallback chain
 *   - If a provider rate-limits or runs out of credits, skips it
 *     temporarily (cooldown) and falls through to the next
 *   - Every request eventually gets an answer as long as >=1 provider works
 *
 * Level 1: Simple greetings/FAQs → Groq
 * Level 2: Health education → Groq → Gemini
 * Level 3: Summarization/Translation → Gemini
 * Level 4: Complex reasoning/risk assessment → OpenAI → Claude
 * Level 5: Counselling/emotional support → Claude → OpenAI
 *
 * Full fallback chain: Groq → Gemini → OpenAI → Claude → HuggingFace
 */

const logger = require('../../utils/logger');

const RATE_LIMIT_PATTERNS = [
  /rate limit/i, /rate_limit/i, /quota/i, /too many requests/i,
  /429/i, /insufficient_quota/i, /exceeded/i, /credit.*exhaust/i,
  /resource.*exhausted/i, /capacity.*exceed/i, /try again later/i,
  /402/i, /payment/i, /billing/i,
];

const COOLDOWN_MS = 60_000; // skip a rate-limited provider for 60s

class AIProviderRouter {
  constructor(providers = {}) {
    this.providers = providers;
    this.cooldowns = {}; // providerName → timestamp when it can be retried
  }

  /**
   * Return the first available provider from a list.
   * Skips any that are in cooldown (recently rate-limited).
   */
  getAvailable(providerNames) {
    const now = Date.now();
    for (const name of providerNames) {
      const provider = this.providers[name];
      if (!provider) continue;
      if (!provider.isAvailable()) continue;
      if (this.cooldowns[name] && this.cooldowns[name] > now) {
        continue; // still in cooldown
      }
      return provider;
    }
    return null;
  }

  /**
   * Preferred providers for each conversation level.
   * These are tried first; the full fallback chain covers the rest.
   */
  getLevelProviders(level) {
    switch (level) {
      case 1: return ['groq'];
      case 2: return ['groq', 'gemini'];
      case 3: return ['gemini'];
      case 4: return ['openai', 'claude'];
      case 5: return ['claude', 'openai'];
      default: return ['groq', 'gemini', 'openai', 'claude', 'huggingface'];
    }
  }

  /**
   * Full fallback chain — tried after level-preferred providers.
   */
  getFallbackChain() {
    return ['groq', 'gemini', 'openai', 'claude', 'huggingface'];
  }

  /**
   * Check if an error is a rate-limit / quota-exhausted condition.
   */
  isRateLimitError(err) {
    const msg = (err.message || '') + (err.status ? ` ${err.status}` : '');
    return RATE_LIMIT_PATTERNS.some(p => p.test(msg));
  }

  /**
   * Put a provider into cooldown so it won't be tried again for a while.
   */
  markCooldown(providerName) {
    this.cooldowns[providerName] = Date.now() + COOLDOWN_MS;
    logger.warn(`AI provider ${providerName} rate-limited, cooling down for ${COOLDOWN_MS / 1000}s`);
  }

  /**
   * Classify a message into a conversation complexity level (1-5).
   */
  classifyLevel(message, patientContext = {}, history = []) {
    const lower = (message || '').toLowerCase().trim();
    const isLongConversation = history.length > 10;
    const hasComplexContext = !!(patientContext.diagnosis || patientContext.currentDrugs);

    // Level 5: Emotional support, long counselling
    if (isLongConversation && (
      /\b(sad\w*|depress\w*|anxi\w*|lonely|scared|worried|suicidal|stress\w*|grief|trauma|counsell\w*)\b/.test(lower) ||
      history.length > 20
    )) return 5;

    // Level 4: Complex reasoning, risk assessment
    if (hasComplexContext && (
      /\b(persistent|severe|chronic|risk|assess|emergency|bleeding|unconscious|difficulty breathing|chest pain|suicidal)\b/.test(lower) ||
      lower.length > 200
    )) return 4;

    // Level 3: Summarization, translation, education
    if (/\b(summar\w*|translat\w*|explain\w*|what is|tell me about|education|teach)\b/.test(lower) &&
        lower.length > 30) return 3;

    // Level 2: Health education / symptom queries
    if (/\b(hiv|tb|st[di]|art|prep|pep|drug|adherence|side effect|cd4|viral load|nutrition|pregnan\w*|breastfeed|malaria|typhoid|hepatitis|symptom|pain|fever|cough|headache|feel|sick|hurt|medication|hospital|doctor|clinic|appointment)\b/.test(lower)) return 2;

    // Level 1: Greetings, short queries
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|how\s+(are|is))\b/.test(lower)) return 1;
    return lower.length < 30 ? 1 : 2;
  }

  /**
   * Route a request through the best available provider.
   *
   * 1. Build ordered list: level-preferred first, then all of fallback chain
   *    that aren't already in the list.
   * 2. Filter to only providers that are configured (have API key).
   * 3. Try each one in order.
   * 4. On rate-limit / quota error, mark cooldown and move to next.
   * 5. On other error, move to next.
   * 6. If all fail, throw AI_PROVIDERS_EXHAUSTED.
   */
  async route(messages, options = {}) {
    const level = options.level || this.classifyLevel(
      messages[messages.length - 1]?.content || '',
      options.patientContext || {},
      options.history || []
    );

    const preferredProviders = options.preferredProviders || this.getLevelProviders(level);
    const fallbackChain = this.getFallbackChain();
    const attemptedChain = [];
    const errors = [];

    // Build deduplicated ordered list: preferred first, then rest of fallback
    const orderedProviders = [...preferredProviders];
    for (const p of fallbackChain) {
      if (!orderedProviders.includes(p)) orderedProviders.push(p);
    }

    for (const providerName of orderedProviders) {
      const provider = this.providers[providerName];

      // Skip if not configured
      if (!provider || !provider.isAvailable()) {
        continue;
      }

      // Skip if in cooldown (recent rate limit)
      if (this.cooldowns[providerName] && this.cooldowns[providerName] > Date.now()) {
        errors.push({ provider: providerName, error: 'Provider in cooldown (recent rate limit)' });
        continue;
      }

      try {
        attemptedChain.push(providerName);
        const result = await provider.generateResponse(messages, options);
        result.level = level;
        result.attemptedChain = attemptedChain;
        result.provider = providerName;
        result.fallbackUsed = attemptedChain.length > 1;

        logger.info(
          `AI route: level=${level} provider=${providerName} ` +
          `chain=${attemptedChain.join('→')} ` +
          `tokens=${(result.usage?.totalTokens || result.usage?.total_tokens) || '?'} ` +
          `latency=${result.latency || '?'}ms`
        );

        return result;
      } catch (err) {
        const errorMsg = err.message || 'Unknown provider error';
        errors.push({ provider: providerName, error: errorMsg });
        attemptedChain.push(providerName);

        if (this.isRateLimitError(err)) {
          this.markCooldown(providerName);
          logger.warn(`AI provider ${providerName} rate-limited/quota exhausted: ${errorMsg}. Cooling down.`);
        } else {
          logger.warn(`AI provider ${providerName} failed: ${errorMsg}. Trying next...`);
        }
      }
    }

    // All providers exhausted
    const err = new Error(`All AI providers unavailable. Tried: ${attemptedChain.join('→')}`);
    err.errors = errors;
    err.attemptedChain = attemptedChain;
    err.code = 'AI_PROVIDERS_EXHAUSTED';
    throw err;
  }

  /**
   * Route to a specific provider method (used by translate, summarize, etc.).
   */
  async routeWithProvider(method, text, options = {}) {
    const provider = this.getAvailable([options.provider]);
    if (!provider) {
      throw new Error(`Provider "${options.provider}" not available or not configured`);
    }
    return provider[method](text, options);
  }

  /**
   * Get the names of all configured (API key present) providers.
   */
  getConfiguredProviders() {
    return Object.entries(this.providers)
      .filter(([, p]) => p.isAvailable())
      .map(([name]) => name);
  }

  /**
   * Clear all cooldowns (e.g. after manual provider health check).
   */
  clearCooldowns() {
    this.cooldowns = {};
    logger.info('AI provider cooldowns cleared');
  }
}

module.exports = AIProviderRouter;
