/**
 * Registration Flow — Onboards new patients via WhatsApp.
 *
 * Steps: welcome → name → age → gender → state → lga → hospital →
 *        hiv_status → art_number (if hiv) → file_number → complete
 */

const session = require('../whatsapp.session');
const whatsappService = require('../whatsapp.service');
const AIPatient = require('../../ai/models/AIPatient');
const logger = require('../../utils/logger');

const STEPS = [
  'welcome',
  'name',
  'age',
  'gender',
  'state',
  'lga',
  'hospital',
  'hiv_status',
  'art_number',
  'file_number',
  'complete',
];

exports.onMessage = async (phone, contactName, text, interactiveId) => {
  const sess = session.get(phone);
  const step = sess?.step || 'welcome';

  switch (step) {
    case 'welcome': {
      await whatsappService.sendText(phone,
        `Welcome to VOA Health Assistant! 🤝\n\n` +
        `I'm here to help with health information, medication reminders, ` +
        `and connecting you to healthcare professionals.\n\n` +
        `Let me register you quickly. What is your full name?`
      );
      session.setStep(phone, 'name');
      break;
    }

    case 'name': {
      session.setData(phone, 'name', text);
      await whatsappService.sendText(phone,
        `Nice to meet you, ${text}! 🎉\n\nHow old are you?`
      );
      session.setStep(phone, 'age');
      break;
    }

    case 'age': {
      const age = parseInt(text);
      if (isNaN(age) || age < 0 || age > 150) {
        await whatsappService.sendText(phone, 'Please enter a valid age (number between 0 and 150).');
        return;
      }
      session.setData(phone, 'age', age);
      await whatsappService.sendButtons(phone, 'Gender', 'What is your gender?', [
        { id: 'male', title: 'Male' },
        { id: 'female', title: 'Female' },
        { id: 'other', title: 'Other' },
      ]);
      session.setStep(phone, 'gender');
      break;
    }

    case 'gender': {
      const gender = interactiveId || text.toLowerCase();
      if (!['male', 'female', 'other'].includes(gender)) {
        await whatsappService.sendButtons(phone, 'Gender', 'Please select your gender:', [
          { id: 'male', title: 'Male' },
          { id: 'female', title: 'Female' },
          { id: 'other', title: 'Other' },
        ]);
        return;
      }
      session.setData(phone, 'gender', gender);
      await whatsappService.sendText(phone, 'Which state do you live in?');
      session.setStep(phone, 'state');
      break;
    }

    case 'state': {
      session.setData(phone, 'state', text);
      await whatsappService.sendText(phone, 'What Local Government Area (LGA)?');
      session.setStep(phone, 'lga');
      break;
    }

    case 'lga': {
      session.setData(phone, 'lga', text);
      await whatsappService.sendText(phone, 'What is your preferred hospital or clinic name? (Or type "skip" if unsure)');
      session.setStep(phone, 'hospital');
      break;
    }

    case 'hospital': {
      const hospital = text.toLowerCase() === 'skip' ? '' : text;
      session.setData(phone, 'hospital', hospital);
      await whatsappService.sendButtons(phone, 'HIV Status', 'Are you HIV positive?', [
        { id: 'hiv_yes', title: 'Yes' },
        { id: 'hiv_no', title: 'No' },
        { id: 'not_sure', title: 'Not sure' },
      ]);
      session.setStep(phone, 'hiv_status');
      break;
    }

    case 'hiv_status': {
      const hiv = interactiveId === 'hiv_yes';
      const notSure = interactiveId === 'not_sure';
      session.setData(phone, 'hiv', hiv);
      session.setData(phone, 'hivNotSure', notSure);

      if (hiv) {
        session.setData(phone, 'artNumber', '');
        await whatsappService.sendText(phone,
          'Thank you for sharing. What is your ART number? (Type "skip" if you don\'t have it)'
        );
        session.setStep(phone, 'art_number');
      } else {
        session.setData(phone, 'artNumber', '');
        await whatsappService.sendText(phone,
          'Do you have a file number? (Type "skip" if not)'
        );
        session.setStep(phone, 'file_number');
      }
      break;
    }

    case 'art_number': {
      const art = text.toLowerCase() === 'skip' ? '' : text;
      session.setData(phone, 'artNumber', art);
      await whatsappService.sendText(phone,
        'Do you have a file number? (Type "skip" if not)'
      );
      session.setStep(phone, 'file_number');
      break;
    }

    case 'file_number': {
      const fileNo = text.toLowerCase() === 'skip' ? '' : text;
      session.setData(phone, 'fileNumber', fileNo);

      // Save patient to database
      const data = sess.data;
      const patient = await AIPatient.create({
        name: data.name,
        phone,
        age: data.age,
        gender: data.gender,
        state: data.state,
        lga: data.lga,
        artNumber: data.artNumber || '',
        fileNumber: fileNo || '',
        diagnosis: {
          hiv: data.hiv || false,
        },
        source: 'whatsapp',
      });

      // Link session to patient
      session.setPatient(phone, patient._id);
      session.setFlow(phone, 'chat');

      await whatsappService.sendText(phone,
        `✅ Registration complete! Welcome, ${data.name}.\n\n` +
        `You can now ask me health questions, find hospitals, or talk to a doctor.\n\n` +
        `Type "help" anytime to see what I can do.`
      );

      logger.info(`WhatsApp registration complete: ${data.name} (${phone})`);
      break;
    }

    default: {
      session.setStep(phone, 'welcome');
      await exports.onMessage(phone, contactName, text, interactiveId);
    }
  }
};
