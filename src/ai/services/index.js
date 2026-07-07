const AIService = require('./AIService');
const providerConfig = require('../config/providers');

let instance = null;

function getAIService() {
  if (!instance) {
    instance = new AIService(providerConfig);
  }
  return instance;
}

module.exports = { getAIService };
