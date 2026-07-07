/**
 * Consent Flow — Handles dual-consent workflow for doctor handoff.
 *
 * Step 1: Ask consent to share biodata → YES/NO
 * Step 2: If YES, ask consent to share chat summary → YES/NO
 * Step 3: Share data with doctor
 */

const session = require('../whatsapp.session');
const whatsappService = require('../whatsapp.service');
const ConsentService = require('../../ai/services/ConsentService');
const DoctorHandoffService = require('../../ai/services/DoctorHandoffService');
const AIPatient = require('../../ai/models/AIPatient');
const logger = require('../../utils/logger');

exports.onMessage = async (phone, contactName, text, interactiveId) => {
  const sess = session.get(phone);
  const step = sess?.data?.consentStep || 'data_sharing';

  if (step === 'data_sharing') {
    if (interactiveId === 'consent_yes' || text.toLowerCase() === 'yes') {
      // Consent granted — record it and ask for summary consent
      const consultationId = sess.data.consultationId;
      if (consultationId) {
        await ConsentService.recordConsent({
          consultationId,
          patientId: sess.patientId,
          type: 'data_sharing',
          granted: true,
          source: 'whatsapp',
        });
      }

      // Notify doctor and ask for summary consent
      try {
        const summaryPrompt = ConsentService.getSummarySharingPrompt();
        await whatsappService.sendButtons(
          phone,
          '✅ Data sharing approved!',
          `${summaryPrompt.details}\n\n${summaryPrompt.question}`,
          [
            { id: 'summary_yes', title: 'YES' },
            { id: 'summary_no', title: 'NO' },
          ]
        );
        session.setData(phone, 'consentStep', 'summary_sharing');
      } catch (err) {
        logger.error(`Consent flow error: ${err.message}`);
        await whatsappService.sendText(phone, 'Thank you. Your information will be shared with the doctor.');
        session.clearFlow(phone);
      }

    } else if (interactiveId === 'consent_no' || text.toLowerCase() === 'no') {
      // Consent denied
      const consultationId = sess.data.consultationId;
      if (consultationId) {
        await ConsentService.recordConsent({
          consultationId,
          patientId: sess.patientId,
          type: 'data_sharing',
          granted: false,
          source: 'whatsapp',
        });
      }

      await whatsappService.sendText(phone,
        'I understand. Your information will not be shared with the doctor without your permission.\n\n' +
        'You can still ask me health questions anytime.'
      );
      session.clearFlow(phone);

    } else {
      // Unexpected — re-prompt
      await whatsappService.sendButtons(
        phone,
        'Data Sharing Consent',
        'Do you allow me to share your information with the doctor?',
        [
          { id: 'consent_yes', title: 'YES' },
          { id: 'consent_no', title: 'NO' },
        ]
      );
    }

  } else if (step === 'summary_sharing') {
    if (interactiveId === 'summary_yes' || text.toLowerCase() === 'yes') {
      const consultationId = sess.data.consultationId;
      if (consultationId) {
        await ConsentService.recordConsent({
          consultationId,
          patientId: sess.patientId,
          type: 'summary_sharing',
          granted: true,
          source: 'whatsapp',
        });

        // Generate and share summary
        try {
          const handoff = await DoctorHandoffService.shareSummary(consultationId);
          const summary = handoff.summary;
          await whatsappService.sendText(phone,
            `✅ Summary shared with doctor!\n\n` +
            `📋 Your Consultation Summary:\n` +
            `Symptoms: ${summary.symptoms || 'As discussed'}\n` +
            `Timeline: ${summary.timeline || 'As discussed'}\n` +
            `Medication: ${summary.currentMedication || 'Not specified'}\n` +
            `Risk: ${summary.riskAssessment || 'Assessed'}\n` +
            `Recommendations: ${summary.recommendations || 'Doctor will review'}\n\n` +
            `The doctor has received your information and will attend to you shortly.`
          );
        } catch (err) {
          logger.error(`Summary share error: ${err.message}`);
          await whatsappService.sendText(phone,
            'Thank you. The doctor has been notified and will review your information.'
          );
        }
      } else {
        await whatsappService.sendText(phone, 'Thank you. The doctor has been notified.');
      }

      session.clearFlow(phone);

    } else if (interactiveId === 'summary_no' || text.toLowerCase() === 'no') {
      const consultationId = sess.data.consultationId;
      if (consultationId) {
        await ConsentService.recordConsent({
          consultationId,
          patientId: sess.patientId,
          type: 'summary_sharing',
          granted: false,
          source: 'whatsapp',
        });
      }

      await whatsappService.sendText(phone,
        'No problem. The doctor has been notified of your consultation request without the chat summary.'
      );
      session.clearFlow(phone);

    } else {
      await whatsappService.sendButtons(
        phone,
        'Share Chat Summary',
        'Would you like to share a summary of our conversation with the doctor to save time?',
        [
          { id: 'summary_yes', title: 'YES' },
          { id: 'summary_no', title: 'NO' },
        ]
      );
    }
  }
};
