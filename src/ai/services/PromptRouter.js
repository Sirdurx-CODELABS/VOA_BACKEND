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
      malaria: {
        keywords: ['malaria', 'plasmodium', 'mosquito', 'antimalarial', 'artemisinin', 'coartem', 'ACT'],
        prompts: ['system', 'malaria', 'patient'],
        knowledge: ['malaria', 'common-faq'],
      },
      diabetes: {
        keywords: ['diabetes', 'diabetic', 'sugar', 'glucose', 'insulin', 'metformin', 'hyperglycemia', 'hypoglycemia'],
        prompts: ['system', 'diabetes', 'patient'],
        knowledge: ['diabetes', 'nutrition', 'common-faq'],
      },
      hypertension: {
        keywords: ['hypertension', 'blood pressure', 'bp', 'high bp', 'amlodipine', 'lisinopril', 'losartan', 'hypertensive'],
        prompts: ['system', 'hypertension', 'patient'],
        knowledge: ['hypertension', 'nutrition', 'common-faq'],
      },
      respiratory: {
        keywords: ['asthma', 'pneumonia', 'bronchitis', 'copd', 'wheezing', 'inhaler', 'salbutamol', 'shortness of breath', 'difficulty breathing'],
        prompts: ['system', 'respiratory', 'safety', 'patient'],
        knowledge: ['respiratory', 'common-faq'],
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
      child_health: {
        keywords: ['child', 'baby', 'infant', 'newborn', 'breastfeeding', 'immunization', 'vaccine', 'growth', 'children', 'pediatric', 'paediatric'],
        prompts: ['system', 'child-health', 'safety', 'patient'],
        knowledge: ['child-health', 'immunization', 'common-faq'],
      },
      first_aid: {
        keywords: ['first aid', 'wound', 'cut', 'burn', 'bleeding', 'sprain', 'fracture', 'bandage', 'injury', 'nose bleed', 'bite', 'sting'],
        prompts: ['system', 'first-aid', 'safety', 'patient'],
        knowledge: ['first-aid', 'common-faq'],
      },
      vaccination: {
        keywords: ['vaccine', 'vaccination', 'immunization', 'shot', 'injection', 'immunity', 'booster', 'routine immunization'],
        prompts: ['system', 'vaccination', 'patient'],
        knowledge: ['immunization', 'common-faq'],
      },
      general_health: {
        keywords: ['fever', 'headache', 'body pain', 'fatigue', 'weakness', 'dizziness', 'vomiting', 'diarrhea', 'nausea', 'dehydration', 'constipation', 'stomach ache', 'abdominal pain', 'bloating', 'back pain', 'joint pain', 'muscle pain', 'sore throat', 'runny nose', 'common cold', 'flu', 'allergy', 'general checkup', 'check up'],
        prompts: ['system', 'general-health', 'patient'],
        knowledge: ['general-health', 'common-faq'],
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

  classifyTopic(intent, message, patientContext = {}, previousTopic = null) {
    const lower = (message || '').toLowerCase();

    if (patientContext.hivPositive && /\b(hiv|art|cd4|viral|adherence|miss|dose|pill|medication)\b/.test(lower)) {
      return 'hiv';
    }

    let matchedTopic = null;
    let matchedPriority = 0;

    for (const [topic, config] of Object.entries(this.topicMap)) {
      if (topic === 'default' || topic === 'doctor' || topic === 'general') continue;
      for (const kw of config.keywords) {
        if (lower.includes(kw)) {
          const priority = kw.length;
          if (priority > matchedPriority) {
            matchedTopic = topic;
            matchedPriority = priority;
          }
        }
      }
    }

    if (matchedTopic) return matchedTopic;

    let intentTopic = null;
    switch (intent) {
      case 'symptom_check': intentTopic = 'general_health'; break;
      case 'medication': intentTopic = 'medication'; break;
      case 'appointment': intentTopic = 'general'; break;
      case 'mental_health': intentTopic = 'mental_health'; break;
      case 'nutrition': intentTopic = 'nutrition'; break;
      case 'maternal_child': intentTopic = 'child_health'; break;
      case 'sti': intentTopic = 'sti'; break;
      case 'tb': intentTopic = 'tb'; break;
      case 'malaria': intentTopic = 'malaria'; break;
      case 'diabetes': intentTopic = 'diabetes'; break;
      case 'hypertension': intentTopic = 'hypertension'; break;
      case 'respiratory': intentTopic = 'respiratory'; break;
      case 'first_aid': intentTopic = 'first_aid'; break;
      case 'vaccination': intentTopic = 'vaccination'; break;
      case 'emergency': intentTopic = 'emergency'; break;
      case 'general_health': intentTopic = 'general_health'; break;
      case 'greeting': intentTopic = 'general'; break;
      case 'closing': intentTopic = 'general'; break;
      default: intentTopic = 'general'; break;
    }

    if (previousTopic && intentTopic === 'general_health' && previousTopic !== 'general') {
      return previousTopic;
    }

    return intentTopic;
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

  /**
   * Resolve role-specific prompt name from the User role string.
   */
  getRolePrompt(role) {
    if (!role) return null;
    const roleMap = {
      doctor: 'doctor',
      nurse: 'nurse',
      pharmacist: 'pharmacist',
      lab_scientist: 'lab_scientist',
      adherence_counselor: 'adherence_counselor',
      case_manager: 'case_manager',
    };
    return roleMap[role] || null;
  }
}

module.exports = new PromptRouter();
