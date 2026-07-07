/**
 * Provider configuration loaded from environment variables.
 */

const config = {
  groq: {
    enabled: process.env.GROQ_ENABLED !== 'false',
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  gemini: {
    enabled: process.env.GEMINI_ENABLED !== 'false',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  openai: {
    enabled: process.env.OPENAI_ENABLED !== 'false',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  claude: {
    enabled: process.env.CLAUDE_ENABLED !== 'false',
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
  },
  huggingface: {
    enabled: process.env.HF_ENABLED !== 'false',
    apiKey: process.env.HF_API_KEY || '',
    model: process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
  },
};

module.exports = config;
