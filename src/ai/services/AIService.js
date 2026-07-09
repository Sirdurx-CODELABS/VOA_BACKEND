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
const PromptLoader = require('./PromptLoader');
const contextEngine = require('./ContextEngine');
const EmbeddingService = require('./EmbeddingService');
const KnowledgeService = require('./KnowledgeService');
const RAGRetriever = require('./RAGRetriever');
const healthResources = require('./HealthResourceService');
const ConversationMemoryService = require('./ConversationMemoryService');
const vectorStore = require('./VectorStore');
const AIPatient = require('../models/AIPatient');
const AIChat = require('../models/AIChat');
const AIConsultation = require('../models/AIConsultation');
const AIKnowledge = require('../models/AIKnowledge');
const logger = require('../../utils/logger');

class AIService {
  constructor(config = {}) {
    this.providers = createAllEnabledProviders(config);
    this.router = new AIProviderRouter(this.providers);
    this.escalationEngine = new EscalationEngine(this.router);
    this.translationService = new TranslationService(this.router);
    this.embeddingService = new EmbeddingService(this.providers);
    this.knowledgeService = new KnowledgeService(this.embeddingService);
    this.ragRetriever = new RAGRetriever(this.embeddingService);

    process.nextTick(async () => {
      try {
        await contextEngine.init();
        await this.knowledgeService.init();
        const indexed = await this.knowledgeService.indexAll();
        logger.info(`AIService: prompt engine + RAG initialized (${indexed.chunks || 0} knowledge chunks indexed)`);
      } catch (err) {
        logger.warn(`AIService: prompt engine / RAG init deferred: ${err.message}`);
      }
    });

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

    // Determine conversation level and previous topic
    const cachedContext = conversationCache.getContext(patient._id);
    const level = cachedContext?.level
      || this.router.classifyLevel(message, patientContext, chat.messages);

    const previousTopic = cachedContext?.lastTopic || null;

    // Build context from prompt engine + RAG
    let ragChunks = [];
    let contextResult = null;
    const isRAGPossible = this.knowledgeService.initialized && this.embeddingService;

    if (isRAGPossible && level >= 2) {
      try {
        const topics = contextEngine.initialized
          ? require('./PromptRouter').getKnowledgeForTopic(
              require('./PromptRouter').classifyTopic(intent, message, patientContext, previousTopic)
            )
          : ['common-faq'];
        ragChunks = await this.ragRetriever.retrieve(message, {
          topics,
          topK: 3,
          minScore: 0.25,
        });
      } catch { /* RAG is best-effort */ }
    }

    if (contextEngine.initialized) {
      try {
        contextResult = await contextEngine.buildContext({
          intent,
          message,
          channel,
          patientContext,
          conversationHistory: chat.messages,
          ragChunks,
          previousTopic,
        });
      } catch { /* context engine is best-effort */ }
    }

    const systemPrompt = contextResult?.context || undefined;

    // Route to AI provider — includes self-verification prompt instruction
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
        systemPrompt,
      }
    );

    // Verify response for hallucinations
    const topic = contextResult?.topic || '';
    const isValid = this.verifyResponse(aiResponse.content, message, topic);
    if (!isValid && aiResponse.content) {
      aiResponse.content += '\n\nPlease speak with a healthcare provider for an accurate assessment.';
    }

    // Evaluate escalation
    const escalation = this.escalationEngine.evaluate(message, patientContext, riskResult);

    // Save patient message
    chat.messages.push({ sender: 'patient', message });

    // Determine final response
    let finalResponse = aiResponse.content;
    if (escalation.shouldEscalate && escalation.escalationMessage) {
      finalResponse = `${aiResponse.content}\n\n${escalation.escalationMessage}`;
    }

    // Extract conversation memory (symptoms, medications mentioned)
    const memoryService = new ConversationMemoryService();
    const extractedMemory = memoryService.extractFromMessage(message);
    const existingMemory = conversationCache.getContext(patient._id)?.memory || {};
    const mergedMemory = memoryService.merge(extractedMemory, existingMemory);
    const memorySummary = memoryService.summarize(mergedMemory);

    // Attach memory summary to patient context for future messages
    if (memorySummary && contextResult) {
      contextResult.context += `\n\n## CONVERSATION MEMORY\n\n${memorySummary}`;
    }

    // Collect health education resources for the detected topic
    const topics = contextResult?.knowledgeTopics || ['general'];
    let resources = [];
    try {
      resources = healthResources.getResourcesForTopics(topics);
    } catch { /* best-effort */ }

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
      lastTopic: contextResult?.topic || '',
      lastRiskLevel: riskResult.level,
      memory: mergedMemory,
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
      topic: contextResult?.topic || '',
      resources: resources.length > 0 ? resources : undefined,
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

    if (/\b(emergency|accident|urgent|bleeding|unconscious|choking|drowning|burn|fracture|overdose|poison)\b/.test(lower)) return 'emergency';
    if (/\b(malaria|plasmodium|antimalarial|coartem|artemisinin)\b/.test(lower)) return 'malaria';
    if (/\b(diabetes|diabetic|sugar|glucose|insulin|hypoglycemia|hyperglycemia)\b/.test(lower)) return 'diabetes';
    if (/\b(hypertension|blood pressure|bp|high bp|hypertensive)\b/.test(lower)) return 'hypertension';
    if (/\b(asthma|pneumonia|bronchitis|copd|wheezing|inhaler|shortness of breath|difficulty breathing)\b/.test(lower)) return 'respiratory';
    if (/\b(tb|tuberculosis|cough.*blood|night sweat|phlegm|sputum|dots|gene xpert)\b/.test(lower)) return 'tb';
    if (/\b(mental|depress|anxiety|stress|suicide|mood|sleep|insomnia|panic|trauma|grief|counsell)\b/.test(lower)) return 'mental_health';
    if (/\b(sti|std|sex|discharge|genital|sore|syphilis|gonorrhea|chlamydia|condom)\b/.test(lower)) return 'sti';
    if (/\b(pregnan|pregnancy|baby|breastfeed|antenatal|postnatal|maternal|child|infant|newborn)\b/.test(lower)) return 'maternal_child';
    if (/\b(vaccine|vaccination|immunization|shot|injection|booster)\b/.test(lower)) return 'vaccination';
    if (/\b(first aid|wound|cut|sprain|bandage|nose bleed|bite|sting|injury)\b/.test(lower)) return 'first_aid';
    if (/\b(nutrition|diet|food|eat|meal|weight|hunger|appetite|vitamin)\b/.test(lower)) return 'nutrition';
    if (/\b(hiv|art|medication|drug|adherence|missed|dose|pill|treatment|tl\d|arv|cd4|viral load)\b/.test(lower)) return 'medication';
    if (/\b(hospital|clinic|doctor|appointment|consult|pharmacy|lab|test|result)\b/.test(lower)) return 'appointment';
    if (/\b(fever|cough|headache|pain|symptom|sick|flu|cold|typhoid|diarrhea|rash|nausea|vomit|body pain|fatigue|weakness|dizziness|sore throat|runny nose|allergy|back pain)\b/.test(lower)) return 'general_health';
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
   * Verify AI response for potential hallucinations.
   * Checks for common hallucination patterns.
   */
  verifyResponse(response, message, topic) {
    if (!response) return false;
    const lower = response.toLowerCase();

    // Check for prescription/dosage content (high risk hallucination)
    if (/\b(take\s+\d+\s*(mg|ml|tablet|pill|cap|capsule)|dose\s+(of|at))\b/.test(lower)) {
      logger.warn(`Hallucination check: possible dosage in response (topic=${topic})`);
      return false;
    }

    // Check for diagnostic language
    if (/\b(you have|you are diagnosed with|diagnosis is|suffering from)\s+(hiv|aids|tb|malaria|diabetes|cancer|hypertension)\b/.test(lower)) {
      logger.warn(`Hallucination check: possible diagnosis statement (topic=${topic})`);
      return false;
    }

    // Check for topic drift — if user asked about X, does response talk about Y?
    if (topic === 'malaria' && !/\b(malaria|fever|mosquito|antimalarial|act)\b/.test(lower)) {
      logger.warn(`Hallucination check: response off-topic (expected=malaria)`);
      return false;
    }

    return true;
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
