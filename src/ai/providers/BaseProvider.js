/**
 * Abstract base class for all AI providers.
 * Every provider must implement these methods.
 */
class BaseProvider {
  constructor(name, config = {}) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider cannot be instantiated directly');
    }
    this.name = name;
    this.enabled = config.enabled !== false;
    this.model = config.model || 'default';
    this.apiKey = config.apiKey || process.env[`${name.toUpperCase().replace(/\s+/g, '_')}_API_KEY`] || '';
    this.maxRetries = config.maxRetries || 2;
  }

  async generateResponse(messages, options = {}) {
    throw new Error(`Provider ${this.name} must implement generateResponse()`);
  }

  async summarize(text, options = {}) {
    throw new Error(`Provider ${this.name} must implement summarize()`);
  }

  async translate(text, targetLang, options = {}) {
    throw new Error(`Provider ${this.name} must implement translate()`);
  }

  async healthAdvice(query, context = {}) {
    throw new Error(`Provider ${this.name} must implement healthAdvice()`);
  }

  async riskAssessment(symptoms, patientContext = {}) {
    throw new Error(`Provider ${this.name} must implement riskAssessment()`);
  }

  isAvailable() {
    return this.enabled && !!this.apiKey;
  }

  estimateCost(inputTokens, outputTokens) {
    return 0;
  }

  buildHealthSystemPrompt() {
    return `You are VOA Health Assistant, a healthcare support AI for the VOA (Voice of Adolescents) platform.

CORE RULES:
- NEVER diagnose diseases — you provide health education, not diagnosis
- NEVER replace doctors — always encourage professional care when necessary
- NEVER prescribe medications
- NEVER invent patient records or hallucinate medical facts
- ALWAYS escalate emergencies (chest pain, suicidal thoughts, severe bleeding, difficulty breathing)
- ALWAYS recommend doctor consultation when symptoms persist or are severe
- Provide WHO-aligned and national guideline-consistent health education

SUPPORTED TOPICS:
HIV, TB, OIs, STIs, Mental Health, Adolescent Health, Maternal Health,
Nutrition, ART Adherence, Viral Load, CD4, Hepatitis B, PEP, PrEP,
Drug Side Effects, Emergency Symptoms

CONVERSATION STYLE:
- Be empathetic, respectful, and non-judgmental
- Use plain, simple language suitable for all literacy levels
- Support English, Hausa, and other local languages
- Collect information step by step: symptom → duration → severity → context
- If patient mentions HIV, TB, or ART, ask about medication adherence
- Always end with a clear next-step recommendation`;
  }
}

module.exports = BaseProvider;
