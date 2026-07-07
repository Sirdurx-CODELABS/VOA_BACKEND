const logger = require('../../utils/logger');

class PromptRouter {
  constructor() {
    this.topicMap = this.buildTopicMap();
  }

  buildTopicMap() {
    return {
      hiv: {
        keywords: ['hiv', 'art', 'cd4', 'viral load', 'undetectable', 'u=u', 'transmission', 'status', 'positive', 'sero'],
        prompts: ['system', 'hiv', 'safety', 'patient'],
        knowledge: ['hiv', 'art', 'viral-load', 'cd4', 'adherence', 'drug-resistance', 'common-faq'],
      },
      tb: {
        keywords: ['tb', 'tuberculosis', 'cough', 'sputum', 'phlegm', 'dots', 'geneXpert'],
        prompts: ['system', 'tb', 'safety', 'patient'],
        knowledge: ['tb', 'common-faq'],
      },
      mental_health: {
        keywords: ['depress', 'anxiety', 'stress', 'suicide', 'mood', 'trauma', 'grief', 'counsell', 'panic', 'insomnia', 'mental'],
        prompts: ['system', 'mental-health', 'emergency', 'safety', 'patient'],
        knowledge: ['mental-health', 'common-faq'],
      },
      adolescent: {
        keywords: ['adolescent', 'teen', 'puberty', 'peer', 'confidential'],
        prompts: ['system', 'adolescent', 'safety', 'patient'],
        knowledge: ['adolescent-health', 'common-faq'],
      },
      nutrition: {
        keywords: ['nutrition', 'diet', 'food', 'eat', 'meal', 'weight', 'appetite', 'vitamin', 'nutrient', 'supplement'],
        prompts: ['system', 'nutrition', 'patient'],
        knowledge: ['nutrition', 'common-faq'],
      },
      oi: {
        keywords: ['opportunistic', 'thrush', 'pneumocystis', 'crypto', 'toxoplasmosis', 'cmv', 'mac', 'prophylaxis', 'septrin', 'cotrimoxazole'],
        prompts: ['system', 'oi', 'safety', 'patient'],
        knowledge: ['oi', 'art', 'cd4', 'common-faq'],
      },
      sti: {
        keywords: ['sti', 'std', 'gonorrhea', 'chlamydia', 'syphilis', 'herpes', 'discharge', 'genital', 'sore', 'wart', 'condom'],
        prompts: ['system', 'sti', 'safety', 'patient'],
        knowledge: ['stis', 'common-faq'],
      },
      pregnancy: {
        keywords: ['pregnan', 'baby', 'breastfeed', 'antenatal', 'postnatal', 'maternal', 'pmtct', 'delivery', 'infant', 'child'],
        prompts: ['system', 'pregnancy', 'safety', 'patient'],
        knowledge: ['pregnancy', 'hiv', 'art', 'common-faq'],
      },
      emergency: {
        keywords: ['emergency', 'accident', 'urgent', 'bleeding', 'unconscious', 'breathing', 'choking', 'drowning', 'burn', 'fracture', 'suicide', 'overdose', 'poison'],
        prompts: ['system', 'emergency', 'escalation', 'safety', 'patient'],
        knowledge: ['common-faq'],
      },
      medication: {
        keywords: ['medication', 'drug', 'dose', 'pill', 'tablet', 'prescription', 'side effect', 'adherence', 'missed dose'],
        prompts: ['system', 'safety', 'patient'],
        knowledge: ['adherence', 'art', 'drug-resistance', 'common-faq'],
      },
      doctor: {
        keywords: [],
        prompts: ['system', 'doctor', 'doctor-summary', 'safety'],
        knowledge: [],
      },
      general: {
        keywords: [],
        prompts: ['system', 'patient'],
        knowledge: ['common-faq'],
      },
      default: {
        prompts: ['system', 'patient'],
        knowledge: ['common-faq'],
      },
    };
  }

  classifyTopic(intent, message, patientContext = {}) {
    const lower = (message || '').toLowerCase();

    if (patientContext.hivPositive && /\b(hiv|art|cd4|viral|adherence|miss|dose|pill|medication)\b/.test(lower)) {
      return 'hiv';
    }

    for (const [topic, config] of Object.entries(this.topicMap)) {
      if (topic === 'default' || topic === 'doctor' || topic === 'general') continue;
      for (const kw of config.keywords) {
        if (lower.includes(kw)) return topic;
      }
    }

    switch (intent) {
      case 'symptom_check': return 'general';
      case 'medication': return 'medication';
      case 'appointment': return 'general';
      case 'mental_health': return 'mental_health';
      case 'nutrition': return 'nutrition';
      case 'maternal_child': return 'pregnancy';
      case 'sti': return 'sti';
      case 'tb': return 'tb';
      case 'emergency': return 'emergency';
      case 'greeting': return 'general';
      case 'closing': return 'general';
      default: return 'general';
    }
  }

  getPromptsForTopic(topic) {
    const config = this.topicMap[topic] || this.topicMap.default;
    return config.prompts;
  }

  getKnowledgeForTopic(topic) {
    const config = this.topicMap[topic] || this.topicMap.default;
    return config.knowledge;
  }

  getChannelPrompt(channel) {
    switch (channel) {
      case 'whatsapp': return 'whatsapp';
      case 'web': return 'web';
      default: return 'web';
    }
  }
}

module.exports = new PromptRouter();
