/**
 * Hospital Finder Flow — Guides user to find hospitals by state/LGA.
 *
 * Steps: state → lga → results → actions (book, maps, call, WhatsApp)
 */

const session = require('../whatsapp.session');
const whatsappService = require('../whatsapp.service');
const HospitalFinderService = require('../../ai/services/HospitalFinderService');
const logger = require('../../utils/logger');

exports.onMessage = async (phone, contactName, text, interactiveId) => {
  const sess = session.get(phone);
  const step = sess?.step || 'state';

  switch (step) {
    case 'state': {
      // Pre-fill from patient profile if available
      const patientState = sess.data?.patientState;
      if (patientState) {
        session.setData(phone, 'searchState', patientState);
        await whatsappService.sendText(phone,
          `You're in ${patientState}. What Local Government Area (LGA)?`
        );
        session.setStep(phone, 'lga');
      } else {
        await whatsappService.sendText(phone, 'What state are you in?');
        session.setStep(phone, 'lga');
      }
      break;
    }

    case 'lga': {
      const searchState = sess.data.searchState || sess.data.state || text;
      let searchLga = text;

      // If state wasn't collected yet, use text as state
      if (!sess.data.searchState) {
        session.setData(phone, 'searchState', text);
        await whatsappService.sendText(phone, 'What Local Government Area (LGA)?');
        session.setStep(phone, 'results');
        return;
      }

      session.setData(phone, 'searchLga', searchLga);
      session.setStep(phone, 'results');

      await whatsappService.sendText(phone, `🔍 Searching for hospitals in ${searchState}, ${searchLga}...`);

      try {
        const result = await HospitalFinderService.findByLocation({
          state: searchState,
          lga: searchLga,
        });

        const hospitals = result.hospitals || result;

        if (!hospitals || hospitals.length === 0) {
          await whatsappService.sendText(phone,
            `No hospitals found in ${searchState}, ${searchLga}.\n\n` +
            `Try a different LGA or type "Find Hospital" to search again.`
          );
          session.setFlow(phone, 'chat');
          return;
        }

        // Show results as a list if many, or direct if few
        if (hospitals.length === 1) {
          await showHospitalDetails(phone, hospitals[0]);
        } else {
          await whatsappService.sendList(
            phone,
            `🏥 Hospitals in ${searchState}, ${searchLga}`,
            `Found ${hospitals.length} hospitals. Select one:`,
            [
              {
                title: 'Hospitals',
                rows: hospitals.slice(0, 10).map((h, i) => ({
                  id: `hospital_${h._id}`,
                  title: h.name.slice(0, 24),
                  description: `${h.lga || ''}, ${h.phone ? h.phone.slice(0, 15) : ''}`.trim().slice(0, 20) || 'Tap to view',
                })),
              },
            ]
          );
          session.setData(phone, 'hospitalResults', hospitals.map(h => ({ _id: h._id.toString(), name: h.name, address: h.address, phone: h.phone })));
          session.setStep(phone, 'select');
        }
      } catch (err) {
        logger.error(`Hospital search error: ${err.message}`);
        await whatsappService.sendText(phone, 'Sorry, I couldn\'t search for hospitals right now. Please try again.');
        session.setFlow(phone, 'chat');
      }
      break;
    }

    case 'select': {
      // User selected a hospital from the list
      const hospId = interactiveId?.replace('hospital_', '');
      if (hospId) {
        const hospital = await HospitalFinderService.getById(hospId);
        if (hospital) {
          await showHospitalDetails(phone, hospital);
        } else {
          await whatsappService.sendText(phone, 'Hospital not found. Please try again.');
          session.setFlow(phone, 'chat');
        }
      } else {
        // Free text — try to match
        const hospitals = sess.data.hospitalResults || [];
        const match = hospitals.find(h => text.toLowerCase().includes(h.name.toLowerCase()));
        if (match) {
          const hospital = await HospitalFinderService.getById(match._id);
          if (hospital) await showHospitalDetails(phone, hospital);
        } else {
          await whatsappService.sendText(phone, 'Please select a hospital from the list.');
        }
      }
      break;
    }

    case 'results': {
      // Direct results display
      const searchState = sess.data.searchState;
      const searchLga = sess.data.searchLga || text;

      session.setData(phone, 'searchLga', searchLga);

      await whatsappService.sendText(phone, `🔍 Searching for hospitals in ${searchState}, ${searchLga}...`);

      try {
        const result = await HospitalFinderService.findByLocation({ state: searchState, lga: searchLga });
        const hospitals = result.hospitals || result;

        if (!hospitals || hospitals.length === 0) {
          await whatsappService.sendText(phone, `No hospitals found. Try a different search.`);
          session.setFlow(phone, 'chat');
          return;
        }

        if (hospitals.length === 1) {
          await showHospitalDetails(phone, hospitals[0]);
        } else {
          await whatsappService.sendList(phone, `🏥 Hospitals`, `Found ${hospitals.length}:`, [
            {
              title: 'Hospitals',
              rows: hospitals.slice(0, 10).map((h, i) => ({
                id: `hospital_${h._id}`,
                title: h.name.slice(0, 24),
                description: h.lga?.slice(0, 20) || '',
              })),
            },
          ]);
          session.setData(phone, 'hospitalResults', hospitals.map(h => ({ _id: h._id.toString(), name: h.name })));
          session.setStep(phone, 'select');
        }
      } catch (err) {
        logger.error(`Hospital search error: ${err.message}`);
        await whatsappService.sendText(phone, 'Search failed. Please try again.');
        session.setFlow(phone, 'chat');
      }
      break;
    }

    default: {
      session.setStep(phone, 'state');
      await exports.onMessage(phone, contactName, text, interactiveId);
    }
  }
};

/**
 * Show hospital details with action buttons.
 */
async function showHospitalDetails(phone, hospital) {
  const details =
    `🏥 *${hospital.name}*\n` +
    `📍 ${hospital.address || 'Address not available'}\n` +
    `📞 ${hospital.phone || 'Phone not available'}\n` +
    `🕐 ${hospital.openingHours || 'Hours not specified'}\n` +
    (hospital.services?.length ? `🩺 Services: ${hospital.services.join(', ')}` : '');

  await whatsappService.sendButtons(
    phone,
    'Hospital Details',
    details.slice(0, 1024),
    [
      { id: `book_${hospital._id}`, title: 'Book Consultation' },
      { id: `maps_${hospital._id}`, title: 'Open Maps' },
      ...(hospital.phone ? [{ id: `call_${hospital._id}`, title: 'Call Hospital' }] : []),
    ].slice(0, 3),
    'VOA Health Assistant'
  );

  session.setStep(phone, 'action');
  session.setData(phone, 'selectedHospitalId', hospital._id?.toString());
}

/**
 * Handle action button responses (called externally).
 */
exports.handleAction = async (phone, action, hospitalId) => {
  if (action === 'book') {
    // Start consultation flow
    session.setFlow(phone, 'consultation', 'type');
    session.setData(phone, 'hospitalId', hospitalId);
    const { onMessage } = require('./consultation.flow');
    await onMessage(phone, '', '', null);
  } else if (action === 'maps') {
    const hospital = await HospitalFinderService.getById(hospitalId);
    if (hospital?.actions?.openGoogleMaps) {
      await whatsappService.sendText(phone, `📍 Open in Google Maps:\n${hospital.actions.openGoogleMaps}`);
    } else {
      await whatsappService.sendText(phone, 'Maps link not available for this hospital.');
    }
  } else if (action === 'call') {
    const hospital = await HospitalFinderService.getById(hospitalId);
    if (hospital?.phone) {
      await whatsappService.sendText(phone, `📞 Call: ${hospital.phone}`);
    }
  }
};
