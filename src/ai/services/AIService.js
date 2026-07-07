/**
 * AIService — Main facade for all AI operations.
 * Coordinates providers, routing, risk assessment, escalation, consent, and logging.
 */

const { createAllEnabledProviders } = require('../providers');
const AIProviderRouter = require('./AIProviderRouter');
const RiskEngine = require('./RiskEngine');
const EscalationEngine = require('./EscalationEngine');
const ProviderLogger = require('./ProviderLogger');
const conversationCache = require('./ConversationCache');
const ConsentService = require('./ConsentService');
const DoctorHandoffService = require('./DoctorHandoffService');
const SummaryService = require('./SummaryService');
const TranslationService = require('./TranslationService');
const HospitalFinderService = require('./HospitalFinderService');
const AIPatient = require('../models/AIPatient');
const AIChat = require('../models/AIChat');
const AIConsultation = require('../models/AIConsultation');
const logger = require('../../utils/logger');

class AIService {
  constructor(config = {}) {
    this.providers = createAllEnabledProviders(config);
    this.router = new AIProviderRouter(this.providers);
    this.escalationEngine = new EscalationEngine(this.router);
    this.translationService = new TranslationService(this.router);
    this.initialized = true;

    logger.info(`AIService initialized with providers: ${Object.keys(this.providers).filter(k => this.providers[k].isAvailable()).join(', ') || 'none'}`);
  }

  /**
   * Main chat method — routes message, assesses risk, handles escalation
   */
  async chat({ message, patientId, phone, channel = 'web', stream = false }) {
    // Resolve patient
    let patient;
    if (patientId) {
      patient = await AIPatient.findById(patientId);
    } else if (phone) {
      patient = await AIPatient.findOne({ phone });
    }
    if (!patient) throw new Error('Patient not found. Please register first.');

    // Get or create active chat session
    let chat = await AIChat.findOne({ patient: patient._id, status: 'active' });
    if (!chat) {
      chat = await AIChat.create({ patient: patient._id, channel });
    }

    // Detect intent
    const intent = this.classifyIntent(message);

    // Build patient context
    const patientContext = this.buildPatientContext(patient);
    patientContext.repeatedComplaint = this.hasRepeatedComplaint(chat, message);

    // Check cache for FAQ
    if (conversationCache.isLikelyFAQ(message) && chat.messages.length <= 2) {
      const cached = conversationCache.getFAQ(message);
      if (cached) {
        chat.messages.push({ sender: 'patient', message });
        chat.messages.push({ sender: 'ai', message: cached });
        chat.intent = intent;
        await chat.save();

        return {
          chatId: chat._id,
          patientId: patient._id,
          response: cached,
          riskScore: 5,
          riskLevel: 'low',
          cached: true,
          intent,
        };
      }
    }

    // Assess risk
    const riskResult = await RiskEngine.fullAssess(this.router, message, patientContext);

    // Determine conversation level
    const level = conversationCache.getContext(patient._id)?.level
      || this.router.classifyLevel(message, patientContext, chat.messages);

    // Route to AI provider
    const aiResponse = await this.router.route(
      [
        ...chat.messages.slice(-6).map(m => ({
          role: m.sender === 'patient' ? 'user' : 'assistant',
          content: m.message,
        })),
        { role: 'user', content: message },
      ],
      {
        level,
        patientContext,
        stream,
        history: chat.messages,
      }
    );

    // Evaluate escalation
    const escalation = this.escalationEngine.evaluate(message, patientContext, riskResult);

    // Save patient message
    chat.messages.push({ sender: 'patient', message });

    // Determine final response
    let finalResponse = aiResponse.content;
    if (escalation.shouldEscalate && escalation.escalationMessage) {
      finalResponse = `${aiResponse.content}\n\n${escalation.escalationMessage}`;
    }

    // Save AI response
    chat.messages.push({ sender: 'ai', message: finalResponse });

    // Update chat metadata
    chat.riskScore = riskResult.score;
    chat.riskLevel = riskResult.level;
    chat.aiRecommendation = riskResult.recommendation || '';
    chat.escalated = escalation.shouldEscalate;
    chat.escalationReason = escalation.reasons?.join('; ') || '';
    chat.intent = intent;
    await chat.save();

    // Update patient context cache
    conversationCache.setContext(patient._id, {
      level,
      lastIntent: intent,
      lastRiskLevel: riskResult.level,
    });

    // Cache FAQ if applicable
    if (conversationCache.isLikelyFAQ(message) && riskResult.level === 'low') {
      conversationCache.setFAQ(message, finalResponse);
    }

    // Log provider usage (async, non-blocking)
    ProviderLogger.logSuccess({
      provider: aiResponse.provider,
      model: aiResponse.model,
      level,
      conversationId: chat._id,
      patientId: patient._id,
      intent,
      riskLevel: riskResult.level,
      doctorEscalation: escalation.shouldEscalate,
      inputTokens: aiResponse.usage?.inputTokens || 0,
      outputTokens: aiResponse.usage?.outputTokens || 0,
      cost: aiResponse.cost || 0,
      latency: aiResponse.latency || 0,
      fallbackUsed: aiResponse.fallbackUsed,
      attemptedChain: aiResponse.attemptedChain,
    }).catch(() => {});

    return {
      chatId: chat._id,
      patientId: patient._id,
      response: finalResponse,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      escalation: escalation.shouldEscalate ? {
        reason: escalation.reasons,
        message: escalation.escalationMessage,
        action: escalation.action,
      } : null,
      provider: aiResponse.provider,
      model: aiResponse.model,
      cached: false,
      intent,
      conversationLevel: level,
    };
  }

  /**
   * Generate a clinical summary for doctor handoff
   */
  async summarize(chatId) {
    const chat = await AIChat.findById(chatId).populate('patient');
    if (!chat) throw new Error('Chat not found');

    return SummaryService.generateClinicalSummary(chat, chat.patient, this.router);
  }

  /**
   * Translate text using appropriate provider
   */
  async translate(text, targetLang, options = {}) {
    return this.translationService.translate(text, targetLang, options);
  }

  /**
   * Assess risk for a message
   */
  async riskAssessment(message, patientContext = {}) {
    return RiskEngine.fullAssess(this.router, message, patientContext);
  }

  /**
   * Find hospitals
   */
  async findHospitals(params) {
    if (params.lat && params.lng) {
      return HospitalFinderService.findNearest(params);
    }
    return HospitalFinderService.findByLocation(params);
  }

  /**
   * Generate doctor summary (handoff with consent)
   */
  async generateDoctorSummary(consultationId) {
    return DoctorHandoffService.shareSummary(consultationId);
  }

  /**
   * Generate patient-friendly summary
   */
  async generatePatientSummary(chatId) {
    const chat = await AIChat.findById(chatId);
    if (!chat) throw new Error('Chat not found');
    return SummaryService.generatePatientSummary(chat);
  }

  /**
   * Classify intent of a message
   */
  classifyIntent(message) {
    const lower = message.toLowerCase();

    if (/\b(fever|cough|headache|pain|symptom|sick|flu|cold|malaria|typhoid|diarrhea|rash|nausea|vomit)\b/.test(lower)) return 'symptom_check';
    if (/\b(hiv|art|medication|drug|adherence|missed|dose|pill|treatment|tl\d|arv)\b/.test(lower)) return 'medication';
    if (/\b(hospital|clinic|doctor|appointment|consult|pharmacy|lab|test|result)\b/.test(lower)) return 'appointment';
    if (/\b(mental|depress|anxiety|stress|suicide|mood|sleep|insomnia|panic|trauma|grief|counsell)\b/.test(lower)) return 'mental_health';
    if (/\b(nutrition|diet|food|eat|meal|weight|hunger|appetite)\b/.test(lower)) return 'nutrition';
    if (/\b(pregnan|pregnancy|baby|breastfeed|antenatal|postnatal|maternal|child|infant)\b/.test(lower)) return 'maternal_child';
    if (/\b(sti|std|sex|discharge|genital|sore|syphilis|gonorrhea|chlamydia)\b/.test(lower)) return 'sti';
    if (/\b(tb|tuberculosis|cough.*blood|night sweat|phlegm|sputum)\b/.test(lower)) return 'tb';
    if (/\b(emergency|accident|urgent|bleeding|unconscious|breathing|choking|drowning|burn|fracture)\b/.test(lower)) return 'emergency';
    if (/\b(hello|hi|hey|good\s*(morning|afternoon|evening)|howdy)\b/.test(lower)) return 'greeting';
    if (/\b(thank|thanks|bye|goodbye|see you|appreciate)\b/.test(lower)) return 'closing';

    return 'general';
  }

  /**
   * Get available providers and their status
   */
  getProviderStatus() {
    const status = {};
    for (const [name, provider] of Object.entries(this.providers)) {
      status[name] = {
        available: provider.isAvailable(),
        model: provider.model,
        enabled: provider.enabled,
      };
    }
    return status;
  }

  /**
   * Build patient context object from patient record
   */
  buildPatientContext(patient) {
    return {
      patientId: patient._id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      state: patient.state,
      lga: patient.lga,
      artNumber: patient.artNumber,
      fileNumber: patient.fileNumber,
      currentDrugs: patient.currentDrugs,
      hivPositive: patient.diagnosis?.hiv || false,
      tbDiagnosis: patient.diagnosis?.tb || false,
      oiDiagnosis: patient.diagnosis?.oi || false,
      diagnosis: patient.diagnosis,
      preferredHospital: patient.preferredHospital,
      preferredDoctor: patient.preferredDoctor,
      patientSummary: [
        patient.diagnosis?.hiv ? 'HIV+' : null,
        patient.diagnosis?.tb ? 'TB+' : null,
        patient.currentDrugs ? `Rx: ${patient.currentDrugs}` : null,
        patient.age ? `Age: ${patient.age}` : null,
        patient.gender ? `Gender: ${patient.gender}` : null,
      ].filter(Boolean).join(', '),
    };
  }

  /**
   * Check if patient is repeating the same complaint
   */
  hasRepeatedComplaint(chat, newMessage) {
    const recentMessages = chat.messages
      .filter(m => m.sender === 'patient')
      .slice(-4);

    if (recentMessages.length < 3) return false;

    const words = new Set(newMessage.toLowerCase().split(/\s+/));
    let matchCount = 0;

    for (const prev of recentMessages) {
      const prevWords = new Set(prev.message.toLowerCase().split(/\s+/));
      const overlap = [...words].filter(w => prevWords.has(w)).length;
      if (overlap > 3) matchCount++;
    }

    return matchCount >= 2;
  }
}

module.exports = AIService;
