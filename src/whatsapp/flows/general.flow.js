/**
 * General Chat Flow — Routes WhatsApp messages to the AI chat engine.
 * This is the default flow for registered patients.
 */

const { getAIService } = require('../../ai/services');
const session = require('../whatsapp.session');
const whatsappService = require('../whatsapp.service');
const AIPatient = require('../../ai/models/AIPatient');
const AIChat = require('../../ai/models/AIChat');
const logger = require('../../utils/logger');

exports.enter = async (phone, contactName, patient) => {
  const greeting = `Hello 👋\n\nI'm VOA Health Assistant.\n\nHow can I help you today?`;

  await whatsappService.sendMenu(phone, greeting, [
    { id: 'hiv', label: 'HIV' },
    { id: 'tb', label: 'TB' },
    { id: 'mental', label: 'Mental Health' },
    { id: 'medication', label: 'Medication' },
    { id: 'clinic', label: 'Clinic' },
    { id: 'doctor', label: 'Talk to Doctor' },
  ]);

  session.setStep(phone, 'chatting');
};

exports.onMessage = async (phone, contactName, text, interactiveId) => {
  const sess = session.get(phone);
  if (!sess || !sess.patientId) {
    await whatsappService.sendText(phone, 'Please register first by typing "register".');
    session.setFlow(phone, 'registration', 'welcome');
    return;
  }

  try {
    const ai = getAIService();
    const result = await ai.chat({
      patientId: sess.patientId,
      message: text,
      channel: 'whatsapp',
    });

    // Send AI response
    await whatsappService.sendText(phone, result.response);

    // If escalation is needed → prompt for consultation
    if (result.escalation) {
      if (sess.data.pendingConsent) {
        // Already handling consent flow
      } else if (result.riskLevel === 'emergency' || result.riskLevel === 'high') {
        await whatsappService.sendButtons(
          phone,
          '🚨 Medical Attention Recommended',
          'Would you like me to help you find a hospital or talk to a doctor?',
          [
            { id: 'find_hospital', title: 'Find Hospital' },
            { id: 'talk_doctor', title: 'Talk to Doctor' },
            { id: 'no_thanks', title: 'No, thanks' },
          ]
        );
      }
    }

    // Update session chat ID
    session.setData(phone, 'chatId', result.chatId?.toString());
    session.setStep(phone, 'chatting');

  } catch (err) {
    logger.error(`Chat flow error for ${phone}: ${err.message}`);
    if (err.message?.includes('AI_PROVIDERS_EXHAUSTED') || err.message?.includes('not found')) {
      await whatsappService.sendText(phone,
        'Sorry, the AI service is temporarily unavailable. Please try again later or type "Talk to Doctor" to speak with a healthcare professional directly.'
      );
    } else {
      await whatsappService.sendText(phone,
        'Sorry, I had trouble processing that. Could you please try again?'
      );
    }
  }
};
