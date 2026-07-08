const PromptLoader = require('./PromptLoader');
const promptLoader = new PromptLoader();
const promptRouter = require('./PromptRouter');
const logger = require('../../utils/logger');

class ContextEngine {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (!promptLoader.initialized) {
      await promptLoader.init();
    }
    this.initialized = true;
    logger.info('ContextEngine initialized');
  }

  async buildContext(options = {}) {
    const {
      intent,
      message,
      channel = 'web',
      role,
      patientContext = {},
      conversationHistory = [],
      ragChunks = [],
    } = options;

    if (!this.initialized) await this.init();

    const topic = promptRouter.classifyTopic(intent, message, patientContext);
    const promptNames = [...promptRouter.getPromptsForTopic(topic)];
    const channelPrompt = promptRouter.getChannelPrompt(channel);
    if (channelPrompt && !promptNames.includes(channelPrompt)) {
      promptNames.push(channelPrompt);
    }

    const rolePrompt = promptRouter.getRolePrompt(role);
    if (rolePrompt && !promptNames.includes(rolePrompt)) {
      promptNames.push(rolePrompt);
    }

    const mergedPrompts = await promptLoader.merge(promptNames);

    const patientSummary = this.buildPatientSummary(patientContext);
    const recentHistory = this.buildHistorySummary(conversationHistory);

    const knowledgeContext = ragChunks.length > 0
      ? `\n\n## RELEVANT KNOWLEDGE\n\n${ragChunks.map(c => c.content).join('\n\n---\n\n')}`
      : '';

    const context = [
      mergedPrompts,
      patientSummary ? `\n\n## PATIENT CONTEXT\n\n${patientSummary}` : '',
      recentHistory ? `\n\n## RECENT CONVERSATION\n\n${recentHistory}` : '',
      knowledgeContext,
    ].filter(Boolean).join('\n\n');

    return {
      context,
      topic,
      role,
      rolePrompt,
      promptsUsed: promptNames,
      knowledgeTopics: promptRouter.getKnowledgeForTopic(topic),
      chunkCount: ragChunks.length,
      contextLength: context.length,
    };
  }

  buildPatientSummary(context) {
    if (!context || Object.keys(context).length === 0) return '';
    const parts = [];
    if (context.name) parts.push(`Name: ${context.name}`);
    if (context.age) parts.push(`Age: ${context.age}`);
    if (context.gender) parts.push(`Gender: ${context.gender}`);
    if (context.state) parts.push(`State: ${context.state}`);
    if (context.lga) parts.push(`LGA: ${context.lga}`);
    if (context.hivPositive) parts.push('HIV Status: Positive');
    if (context.tbDiagnosis) parts.push('TB: Yes');
    if (context.oiDiagnosis) parts.push('OI History: Yes');
    if (context.artNumber) parts.push(`ART Number: ${context.artNumber}`);
    if (context.currentDrugs) parts.push(`Current Medications: ${context.currentDrugs}`);
    if (context.repeatedComplaint) parts.push('Note: Patient has raised similar complaints recently.');
    return parts.join(', ');
  }

  buildHistorySummary(history) {
    if (!history || history.length === 0) return '';
    const recent = history.slice(-6);
    return recent.map(m =>
      `${m.sender === 'patient' ? 'Patient' : 'Assistant'}: ${m.message}`
    ).join('\n');
  }
}

module.exports = new ContextEngine();
