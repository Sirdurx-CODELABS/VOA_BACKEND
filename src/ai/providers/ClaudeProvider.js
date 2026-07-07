const BaseProvider = require('./BaseProvider');

const COST_PER_1K = {
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
};

class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super('claude', config);
    this.model = config.model || 'claude-3-haiku-20240307';
    this.baseURL = 'https://api.anthropic.com/v1';
  }

  async request(endpoint, body) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error (${response.status}): ${err}`);
    }

    return response.json();
  }

  buildMessages(messages) {
    return messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
  }

  async generateResponse(messages, options = {}) {
    const startTime = Date.now();

    const body = {
      model: options.model || this.model,
      system: options.systemPrompt || this.buildHealthSystemPrompt(),
      messages: this.buildMessages(messages),
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.3,
    };

    const data = await this.request('/messages', body);
    const latency = Date.now() - startTime;
    const usage = data.usage || {};
    const cost = this.estimateCost(usage.input_tokens || 0, usage.output_tokens || 0);

    return {
      content: data.content?.[0]?.text || '',
      model: data.model || this.model,
      usage: {
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      },
      cost,
      latency,
      provider: this.name,
    };
  }

  async summarize(text, options = {}) {
    const messages = [
      { role: 'user', content: `Summarize the following healthcare conversation concisely:\n\n${text}` },
    ];
    return this.generateResponse(messages, {
      ...options,
      model: options.model || 'claude-3-haiku-20240307',
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

  async healthAdvice(query, context = {}) {
    const messages = [{ role: 'user', content: query }];
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
    const pricing = COST_PER_1K[this.model] || COST_PER_1K['claude-3-haiku-20240307'];
    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  }
}

module.exports = ClaudeProvider;
