const BaseProvider = require('./BaseProvider');

const COST_PER_1K = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
};

class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super('openai', config);
    this.model = config.model || 'gpt-4o-mini';
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const OpenAI = require('openai');
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async generateResponse(messages, options = {}) {
    const client = await this.getClient();
    const startTime = Date.now();

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

    const latency = Date.now() - startTime;
    const usage = completion.usage || {};
    const cost = this.estimateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0);

    return {
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
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
      model: options.model || 'gpt-4o-mini',
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
      model: options.model || 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 600,
    });
  }

  async healthAdvice(query, context = {}) {
    const contextStr = context.patientSummary ? `Patient context: ${context.patientSummary}` : '';
    const messages = [
      ...(contextStr ? [{ role: 'system', content: contextStr }] : []),
      { role: 'user', content: query },
    ];
    return this.generateResponse(messages, { model: 'gpt-4o-mini', temperature: 0.3, maxTokens: 800 });
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
    return this.generateResponse(messages, { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 500 });
  }

  estimateCost(inputTokens, outputTokens) {
    const pricing = COST_PER_1K[this.model] || COST_PER_1K['gpt-4o-mini'];
    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  }
}

module.exports = OpenAIProvider;
