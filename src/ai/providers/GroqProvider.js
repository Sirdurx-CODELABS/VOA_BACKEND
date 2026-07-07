const BaseProvider = require('./BaseProvider');

class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super('groq', config);
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const OpenAI = require('openai');
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL,
      });
    }
    return this.client;
  }

  async generateResponse(messages, options = {}) {
    const client = await this.getClient();
    const completion = await client.chat.completions.create({
      model: options.model || this.model,
      messages: [
        { role: 'system', content: options.systemPrompt || this.buildHealthSystemPrompt() },
        ...messages,
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 800,
      stream: options.stream || false,
    });

    return {
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage,
      provider: this.name,
    };
  }

  async summarize(text, options = {}) {
    const messages = [
      { role: 'user', content: `Summarize the following healthcare conversation concisely:\n\n${text}` },
    ];
    return this.generateResponse(messages, {
      ...options,
      temperature: 0.2,
      maxTokens: 400,
    });
  }

  async translate(text, targetLang, options = {}) {
    const messages = [
      { role: 'user', content: `Translate the following to ${targetLang}. Preserve medical accuracy:\n\n${text}` },
    ];
    return this.generateResponse(messages, {
      ...options,
      temperature: 0.1,
      maxTokens: 600,
    });
  }

  async generateEmbedding(text, options = {}) {
    throw new Error('Groq does not support embeddings API');
  }

  async healthAdvice(query, context = {}) {
    const contextStr = context.patientSummary ? `Patient context: ${context.patientSummary}` : '';
    const messages = [
      ...(contextStr ? [{ role: 'system', content: contextStr }] : []),
      { role: 'user', content: query },
    ];
    return this.generateResponse(messages, { temperature: 0.3, maxTokens: 800 });
  }

  async riskAssessment(symptoms, patientContext = {}) {
    const contextStr = Object.entries(patientContext)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const prompt = `Assess the medical risk based on these symptoms and patient context.
Return ONLY a JSON object with: riskLevel ("low"/"moderate"/"high"/"emergency"), riskScore (0-100), explanation, and recommendation.

Symptoms: ${symptoms}
${contextStr ? `Patient Context: ${contextStr}` : ''}`;

    const messages = [{ role: 'user', content: prompt }];
    return this.generateResponse(messages, { temperature: 0.1, maxTokens: 500 });
  }

  estimateCost(inputTokens, outputTokens) {
    // Groq is currently free tier
    return 0;
  }
}

module.exports = GroqProvider;
