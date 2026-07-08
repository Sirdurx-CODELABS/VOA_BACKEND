/**
 * MessageHandler — Routes incoming WhatsApp messages to the correct flow
 * based on the current session state and message content.
 *
 * Flow transitions:
 *   No patient → registration flow
 *   Has patient → chat flow (default), or explicit keyword to enter other flows
 *   Registration complete → chat flow
 *   "Talk to doctor" → consultation flow
 *   "Find hospital" → hospital flow
 *   Consent prompt → consent flow
 */

const session = require('./whatsapp.session');
const whatsappService = require('./whatsapp.service');
const AIPatient = require('../ai/models/AIPatient');
const AIReminder = require('../ai/models/AIReminder');
const AdherenceService = require('../ai/services/AdherenceService');
const logger = require('../utils/logger');

const flows = {
  registration: require('./flows/registration.flow'),
  chat: require('./flows/general.flow'),
  consent: require('./flows/consent.flow'),
  hospital: require('./flows/hospital.flow'),
  consultation: require('./flows/consultation.flow'),
};

const FLOW_KEYWORDS = {
  hospital: ['hospital', 'clinic', 'find hospital', 'nearest hospital', 'health facility', 'nearby'],
  doctor: ['doctor', 'talk to doctor', 'speak to doctor', 'see a doctor', 'consultation', 'consult'],
};

exports.handle = async (phone, contactName, text, interactiveId, msgType) => {
  let sess = session.get(phone);

  // --- No session / first message → check if patient exists ---
  if (!sess) {
    const patient = await AIPatient.findOne({ phone }).lean();
    if (patient) {
      sess = session.getOrCreate(phone);
      session.setPatient(phone, patient._id);
      session.setFlow(phone, 'chat');
      await flows.chat.enter(phone, contactName, patient);
    } else {
      sess = session.getOrCreate(phone);
      session.setFlow(phone, 'registration', 'welcome');
      await flows.registration.onMessage(phone, contactName, '', interactiveId);
    }
    return;
  }

  // --- Check for reminder interactive reply ---
  const reminderActions = ['taken', 'snooze', 'skip', 'need_help'];
  if (interactiveId && reminderActions.includes(interactiveId)) {
    try {
      const patient = await AIPatient.findOne({ phone }).lean();
      if (patient) {
        const pendingReminder = await AIReminder.findOne({
          patient: patient._id,
          status: { $in: ['pending', 'sent'] },
        }).sort({ scheduledTime: -1 });
        if (pendingReminder) {
          const actionMap = { taken: 'taken', snooze: 'snoozed', skip: 'skipped', need_help: 'need_help' };
          await AdherenceService.processAction(pendingReminder._id, actionMap[interactiveId] || 'need_help', {
            note: text,
            source: 'whatsapp',
          });

          if (interactiveId === 'need_help') {
            // Route to AI chat for help
            session.setFlow(phone, 'chat');
            const flows = require('./message.handler').flows || {};
            const chatFlow = require('./flows/general.flow');
            if (chatFlow) await chatFlow.enter(phone, contactName, patient);
            return;
          }

          const responses = {
            taken: '✅ Great! Your medication has been recorded as taken.',
            snooze: '⏰ I will remind you again in 10 minutes.',
            skip: '⏭️ Noted. If you need help, type "help" anytime.',
            need_help: '🤖 Let me connect you with someone who can help.',
          };
          await whatsappService.sendText(phone, responses[interactiveId] || 'Thank you!');
          return;
        }
      }
    } catch (err) {
      logger.error(`Reminder callback error for ${phone}: ${err.message}`);
    }
  }

  // --- Existing session → route to current flow ---
  const flowName = sess.flow || 'chat';

  // If in chat flow, check if user wants to switch to another flow
  if (flowName === 'chat') {
    const lower = text.toLowerCase().trim();

    // Check for flow-switching keywords
    if (FLOW_KEYWORDS.hospital.some(k => lower.includes(k))) {
      session.setFlow(phone, 'hospital', 'state');
      await flows.hospital.onMessage(phone, contactName, '', interactiveId);
      return;
    }
    if (FLOW_KEYWORDS.doctor.some(k => lower.includes(k))) {
      session.setFlow(phone, 'consultation', 'type');
      await flows.consultation.onMessage(phone, contactName, '', interactiveId);
      return;
    }
    // Consent flows are triggered by the AI response, detected via session data
    if (sess.data.pendingConsent) {
      session.setFlow(phone, 'consent', sess.data.pendingConsent);
      await flows.consent.onMessage(phone, contactName, text, interactiveId);
      return;
    }
  }

  // Route to the current flow
  const flow = flows[flowName];
  if (flow) {
    await flow.onMessage(phone, contactName, text, interactiveId);
  } else {
    // Unknown flow — reset to chat
    session.setFlow(phone, 'chat');
    const patient = await AIPatient.findById(sess.patientId).lean();
    if (patient) await flows.chat.enter(phone, contactName, patient);
  }
};
