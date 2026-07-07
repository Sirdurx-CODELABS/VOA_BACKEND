/**
 * SummaryService — Generates structured clinical summaries for doctor handoff.
 * Can use AI providers or fall back to template-based summaries.
 */

const conversationCache = require('./ConversationCache');

class SummaryService {
  /**
   * Generate a clinical summary from chat + patient data
   */
  async generateClinicalSummary(chat, patient, aiRouter = null) {
    // Check cache first
    const cached = conversationCache.getSummary(chat?._id);
    if (cached) return cached;

    // If we have an AI router, use it for a rich summary
    if (aiRouter) {
      try {
        const provider = aiRouter.getAvailable(['openai', 'claude', 'gemini']);
        if (provider) {
          return await this.aiSummary(provider, chat, patient);
        }
      } catch {
        // Fall through to template
      }
    }

    // Template-based fallback
    return this.templateSummary(chat, patient);
  }

  async aiSummary(provider, chat, patient) {
    const conversationText = chat.messages
      .map(m => `[${m.sender}]: ${m.message}`)
      .join('\n');

    const prompt = `Generate a concise, structured clinical summary from this patient conversation.

Patient: ${patient?.name || 'Unknown'}
${patient?.age ? `Age: ${patient.age}` : ''}
${patient?.gender ? `Gender: ${patient.gender}` : ''}
${patient?.diagnosis?.hiv ? 'HIV Status: Positive' : ''}
${patient?.currentDrugs ? `Current Medications: ${patient.currentDrugs}` : ''}

Conversation:
${conversationText.substring(0, 3000)}

Format the response as a structured summary with these sections:
- Symptoms (key symptoms reported)
- Timeline (duration, onset, progression)
- Current Medication (any medications mentioned)
- Concerns (specific worries or complications mentioned)
- Risk Assessment (overall risk evaluation)
- Recommendations (suggested next steps)
- Outstanding Questions (what still needs to be answered)`;

    const result = await provider.generateResponse(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 600 }
    );

    const summary = this.parseAISummary(result.content, patient);
    conversationCache.setSummary(chat?._id, summary);
    return summary;
  }

  templateSummary(chat, patient) {
    const patientMsgs = chat?.messages?.filter(m => m.sender === 'patient') || [];
    const symptoms = patientMsgs.map(m => m.message).join('; ');

    const summary = {
      symptoms: symptoms.substring(0, 500),
      timeline: 'See conversation history for details.',
      currentMedication: patient?.currentDrugs || 'Not specified',
      concerns: 'Refer to conversation for specific concerns.',
      riskAssessment: `Risk level based on conversation: ${chat?.riskLevel || 'not assessed'}`,
      recommendations: 'Professional consultation recommended for proper evaluation.',
      outstandingQuestions: [],
    };

    conversationCache.setSummary(chat?._id, summary);
    return summary;
  }

  parseAISummary(aiText, patient) {
    const summary = {
      symptoms: '',
      timeline: '',
      currentMedication: patient?.currentDrugs || '',
      concerns: '',
      riskAssessment: '',
      recommendations: '',
      outstandingQuestions: [],
    };

    const sections = {
      symptoms: ['symptoms', 'symptom'],
      timeline: ['timeline', 'duration', 'onset'],
      medication: ['current medication', 'medication', 'current drugs'],
      concerns: ['concerns', 'complications', 'worries'],
      risk: ['risk assessment', 'risk', 'risk level'],
      recommendations: ['recommendations', 'recommendation', 'next steps', 'suggested'],
      questions: ['outstanding questions', 'questions', 'unanswered'],
    };

    let currentSection = null;
    for (const line of aiText.split('\n')) {
      const trimmed = line.replace(/^[*\-\d.#]+/, '').trim().toLowerCase();

      for (const [key, keywords] of Object.entries(sections)) {
        if (keywords.some(kw => trimmed.startsWith(kw) || trimmed.includes(kw + ':'))) {
          currentSection = key;
          break;
        }
      }

      if (currentSection && line.includes(':')) {
        const value = line.split(':').slice(1).join(':').trim();
        if (currentSection === 'questions') {
          summary.outstandingQuestions.push(value);
        } else if (currentSection === 'medication') {
          summary.currentMedication = value;
        } else if (currentSection === 'risk') {
          summary.riskAssessment = value;
        } else if (currentSection === 'recommendations') {
          summary.recommendations = value;
        } else if (currentSection === 'symptoms') {
          summary.symptoms = value;
        } else if (currentSection === 'timeline') {
          summary.timeline = value;
        } else if (currentSection === 'concerns') {
          summary.concerns = value;
        }
      }
    }

    return summary;
  }

  /**
   * Generate a patient-friendly summary of their conversation
   */
  generatePatientSummary(chat) {
    const messages = chat.messages || [];
    const exchangeCount = messages.filter(m => m.sender === 'patient').length;

    return {
      date: chat.createdAt,
      exchangeCount,
      topics: chat.intent || 'General inquiry',
      riskLevel: chat.riskLevel || 'low',
      escalated: chat.escalated,
      summary: `You had a conversation about ${chat.intent || 'your health concerns'}. ${
        chat.escalated
          ? 'Based on your symptoms, you were connected to a healthcare professional.'
          : 'Health education was provided. Please consult a doctor if symptoms persist.'
      }`,
    };
  }
}

module.exports = new SummaryService();
