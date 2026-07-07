const GroqProvider = require('./GroqProvider');
const GeminiProvider = require('./GeminiProvider');
const OpenAIProvider = require('./OpenAIProvider');
const ClaudeProvider = require('./ClaudeProvider');
const HuggingFaceProvider = require('./HuggingFaceProvider');

const PROVIDER_MAP = {
  groq: GroqProvider,
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  claude: ClaudeProvider,
  huggingface: HuggingFaceProvider,
};

function createProvider(name, config = {}) {
  const ProviderClass = PROVIDER_MAP[name];
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(PROVIDER_MAP).join(', ')}`);
  }
  return new ProviderClass(config);
}

function createAllEnabledProviders(config = {}) {
  const providers = {};
  for (const [name, ProviderClass] of Object.entries(PROVIDER_MAP)) {
    const providerConfig = config[name] || {};
    try {
      const provider = new ProviderClass(providerConfig);
      providers[name] = provider;
    } catch {
      // Skip providers that fail to initialize
    }
  }
  return providers;
}

module.exports = { createProvider, createAllEnabledProviders, PROVIDER_MAP };
