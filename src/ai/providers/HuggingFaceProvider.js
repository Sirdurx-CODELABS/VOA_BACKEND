const BaseProvider = require('./BaseProvider');

class HuggingFaceProvider extends BaseProvider {
  constructor(config = {}) {
    super('huggingface', config);
    this.model = config.model || 'mistralai/Mistral-7B-Instruct-v0.3';
    this.baseURL = 'https://api-inference.huggingface.co/models';
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const { HfInference } = require('@huggingface/inference');
      this.client = new HfInference(this.apiKey);
    }
    return this.client;
  }

  buildPrompt(systemPrompt, messages) {
    let prompt = `<s>[INST] ${systemPrompt || this.buildHealthSystemPrompt()}\n\n`;
    for (const msg of messages) {
      if (msg.role === 'user') {
        prompt += `${msg.content} [/INST]`;
      } else {
        prompt += `${msg.content} [INST]`;
      }
    }
    return prompt;
  }

  async generateResponse(messages, options = {}) {
    const client = await this.getClient();
    const startTime = Date.now();

    const prompt = this.buildPrompt(options.systemPrompt, messages);

    const result = await client.textGeneration({
      model: options.model || this.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 800,
        temperature: options.temperature ?? 0.3,
        return_full_text: false,
      },
    });

    const latency = Date.now() - startTime;

    return {
      content: result.generated_text || '',
      model: this.model,
      usage: { totalTokens: 0 },
      cost: 0,
      latency,
      provider: this.name,
    };
  }

  async summarize(text, options = {}) {
    const messages = [
      { role: 'user', content: `Summarize concisely:\n\n${text}` },
    ];
    return this.generateResponse(messages, { ...options, temperature: 0.2, maxTokens: 400 });
  }

  async translate(text, targetLang, options = {}) {
    const messages = [
      { role: 'user', content: `Translate to ${targetLang}:\n\n${text}` },
    ];
    return this.generateResponse(messages, { ...options, temperature: 0.1, maxTokens: 600 });
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

    const prompt = `Assess risk. Return JSON: riskLevel ("low"/"moderate"/"high"/"emergency"), riskScore (0-100), explanation, recommendation.
Symptoms: ${symptoms}${contextStr ? `\nContext: ${contextStr}` : ''}`;

    const messages = [{ role: 'user', content: prompt }];
    return this.generateResponse(messages, { temperature: 0.1, maxTokens: 500 });
  }

  estimateCost(inputTokens, outputTokens) {
    // Hugging Face Inference API is free with rate limits
    return 0;
  }
}

module.exports = HuggingFaceProvider;
