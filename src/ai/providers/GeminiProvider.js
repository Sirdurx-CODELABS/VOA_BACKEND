const BaseProvider = require('./BaseProvider');

class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super('gemini', config);
    this.model = config.model || 'gemini-2.0-flash';
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      this.client = genAI.getGenerativeModel({ model: this.model });
    }
    return this.client;
  }

  buildMessages(systemPrompt, messages) {
    const parts = [{ text: systemPrompt || this.buildHealthSystemPrompt() }];
    for (const msg of messages) {
      parts.push({ text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}` });
    }
    return parts;
  }

  async generateResponse(messages, options = {}) {
    const model = await this.getClient();
    const parts = this.buildMessages(options.systemPrompt, messages);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens || 800,
      },
    });

    const response = result.response;
    const usage = { totalTokens: response.usageMetadata?.totalTokenCount || 0 };

    return {
      content: response.text(),
      model: this.model,
      usage,
      provider: this.name,
    };
  }

  async summarize(text, options = {}) {
    const messages = [
      { role: 'user', content: `Summarize the following healthcare conversation concisely:\n\n${text}` },
    ];
    return this.generateResponse(messages, { ...options, temperature: 0.2, maxTokens: 400 });
  }

  async translate(text, targetLang, options = {}) {
    const messages = [
      { role: 'user', content: `Translate the following to ${targetLang}. Preserve medical accuracy:\n\n${text}` },
    ];
    return this.generateResponse(messages, { ...options, temperature: 0.1, maxTokens: 600 });
  }

  async generateEmbedding(text, options = {}) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding?.values || [];
    return { embedding, provider: this.name, model: 'text-embedding-004' };
  }

  async healthAdvice(query, context = {}) {
    const messages = [{ role: 'user', content: query }];
    return this.generateResponse(messages, {
      temperature: 0.3,
      maxTokens: 800,
      systemPrompt: context.patientSummary
        ? `${this.buildHealthSystemPrompt()}\nPatient context: ${context.patientSummary}`
        : undefined,
    });
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
    // Gemini has a generous free tier
    return 0;
  }
}

module.exports = GeminiProvider;
