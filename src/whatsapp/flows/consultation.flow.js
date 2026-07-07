/**
 * Consultation Flow — Books a consultation (online or in-person).
 *
 * Steps: type → doctor/hospital → confirm → consent → handoff
 */

const session = require('../whatsapp.session');
const whatsappService = require('../whatsapp.service');
const { getAIService } = require('../../ai/services');
const AIConsultation = require('../../ai/models/AIConsultation');
const AIDoctor = require('../../ai/models/AIDoctor');
const AIPatient = require('../../ai/models/AIPatient');
const DoctorHandoffService = require('../../ai/services/DoctorHandoffService');
const logger = require('../../utils/logger');

exports.onMessage = async (phone, contactName, text, interactiveId) => {
  const sess = session.get(phone);
  let step = sess?.step || 'type';

  switch (step) {
    case 'type': {
      await whatsappService.sendButtons(
        phone,
        'Consultation Type',
        'Would you like an online consultation or in-person visit?',
        [
          { id: 'online', title: 'Online' },
          { id: 'in_person', title: 'In-Person' },
        ]
      );
      session.setStep(phone, 'select_type');
      break;
    }

    case 'select_type': {
      const consultType = interactiveId === 'online' ? 'online' : 'in-person';
      session.setData(phone, 'consultType', consultType);

      if (consultType === 'in-person') {
        // Show nearby hospitals (reuse hospital flow's state)
        session.setStep(phone, 'hospital');
        await whatsappService.sendText(phone, 'Which state are you in?');
      } else {
        // Show available doctors
        session.setStep(phone, 'doctor');
        await showAvailableDoctors(phone);
      }
      break;
    }

    case 'doctor': {
      // Handle doctor selection or list display
      const doctorId = interactiveId?.replace('doctor_', '');
      if (doctorId) {
        session.setData(phone, 'doctorId', doctorId);
        await confirmBooking(phone);
      } else {
        await showAvailableDoctors(phone);
      }
      break;
    }

    case 'hospital': {
      // Collect state, then show hospitals
      if (!sess.data.consultState) {
        session.setData(phone, 'consultState', text);
        await whatsappService.sendText(phone, 'What LGA?');
        session.setStep(phone, 'hospital_lga');
      }
      break;
    }

    case 'hospital_lga': {
      session.setData(phone, 'consultLga', text);
      const { HospitalFinderService } = require('../../ai/services/HospitalFinderService');
      const result = await HospitalFinderService.findByLocation({
        state: sess.data.consultState,
        lga: text,
      });
      const hospitals = result.hospitals || result;

      if (!hospitals?.length) {
        await whatsappService.sendText(phone, 'No hospitals found. Try a different area.');
        session.setFlow(phone, 'chat');
        return;
      }

      await whatsappService.sendList(phone, '🏥 Select Hospital', 'Choose a hospital:', [
        {
          title: 'Hospitals',
          rows: hospitals.slice(0, 10).map((h, i) => ({
            id: `hosp_${h._id}`,
            title: h.name.slice(0, 24),
            description: h.lga?.slice(0, 20) || '',
          })),
        },
      ]);
      session.setData(phone, 'hospitalResults', hospitals.map(h => ({ _id: h._id.toString(), name: h.name })));
      session.setStep(phone, 'confirm_hospital');
      break;
    }

    case 'confirm_hospital': {
      const hospId = interactiveId?.replace('hosp_', '');
      if (hospId) {
        session.setData(phone, 'hospitalId', hospId);
        await confirmBooking(phone);
      } else {
        await whatsappService.sendText(phone, 'Please select a hospital from the list.');
      }
      break;
    }

    case 'confirm': {
      if (interactiveId === 'confirm_yes' || text.toLowerCase() === 'yes') {
        await createConsultation(phone);
      } else {
        await whatsappService.sendText(phone, 'Consultation cancelled. How else can I help you?');
        session.setFlow(phone, 'chat');
      }
      break;
    }

    default: {
      session.setStep(phone, 'type');
      await exports.onMessage(phone, contactName, text, interactiveId);
    }
  }
};

async function showAvailableDoctors(phone) {
  const doctors = await AIDoctor.find({ isAvailable: true })
    .select('name specialization yearsOfExperience consultationFee')
    .limit(10)
    .lean();

  if (!doctors.length) {
    await whatsappService.sendText(phone,
      'No doctors are currently available. Please try again later or visit a hospital.'
    );
    session.setFlow(phone, 'chat');
    return;
  }

  await whatsappService.sendList(phone, '👨‍⚕️ Available Doctors', 'Select a doctor:', [
    {
      title: 'Doctors',
      rows: doctors.map(d => ({
        id: `doctor_${d._id}`,
        title: d.name.slice(0, 24),
        description: `${d.specialization || 'General'}`.slice(0, 20),
      })),
    },
  ]);
  session.setStep(phone, 'doctor');
}

async function confirmBooking(phone) {
  const sess = session.get(phone);
  const consultType = sess.data.consultType || 'online';
  const details = consultType === 'online'
    ? `Online consultation`
    : `In-person visit at selected hospital`;

  await whatsappService.sendButtons(
    phone,
    'Confirm Booking',
    `Please confirm your consultation:\n\n📋 Type: ${consultType === 'online' ? 'Online' : 'In-Person'}\n${details}\n\nShall I proceed?`,
    [
      { id: 'confirm_yes', title: '✅ Confirm' },
      { id: 'confirm_no', title: '❌ Cancel' },
    ]
  );
  session.setStep(phone, 'confirm');
}

async function createConsultation(phone) {
  const sess = session.get(phone);
  const patient = await AIPatient.findById(sess.patientId);

  if (!patient) {
    await whatsappService.sendText(phone, 'Patient record not found. Please register first.');
    session.setFlow(phone, 'registration', 'welcome');
    return;
  }

  try {
    const consultation = await AIConsultation.create({
      patient: patient._id,
      type: sess.data.consultType || 'online',
      hospital: sess.data.hospitalId || null,
      doctor: sess.data.doctorId || null,
      chat: sess.data.chatId || null,
      status: 'pending',
    });

    // Initiate handoff with consent prompt
    const handoff = await DoctorHandoffService.initiateHandoff(
      patient,
      { messages: [], _id: sess.data.chatId },
      consultation,
      { level: 'moderate', score: 30 }
    );

    // Store consultation ID in session for consent flow
    session.setData(phone, 'consultationId', consultation._id.toString());
    session.setData(phone, 'pendingConsent', 'data_sharing');

    // Switch to consent flow
    const { onMessage } = require('./consent.flow');
    session.setFlow(phone, 'consent');
    session.setData(phone, 'consentStep', 'data_sharing');
    session.setData(phone, 'consultationId', consultation._id.toString());

    // Send consent prompt
    await whatsappService.sendButtons(
      phone,
      'Consultation Requested ✅',
      `${handoff.prompt.details}\n\n${handoff.prompt.question}`,
      [
        { id: 'consent_yes', title: 'YES' },
        { id: 'consent_no', title: 'NO' },
      ]
    );

    logger.info(`WhatsApp consultation created: ${consultation._id} for ${phone}`);

  } catch (err) {
    logger.error(`Consultation creation error: ${err.message}`);
    await whatsappService.sendText(phone, 'Sorry, I couldn\'t create the consultation. Please try again.');
    session.setFlow(phone, 'chat');
  }
}
