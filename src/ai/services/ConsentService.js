/**
 * ConsentService — Manages patient consent workflow for data sharing.
 * Every data share requires explicit opt-in, logged to AIConsentLog.
 */

const AIConsultation = require('../models/AIConsultation');
const AIConsentLog = require('../models/AIConsentLog');
const AIPatient = require('../models/AIPatient');
const logger = require('../../utils/logger');

const CONSENT_TYPES = {
  DATA_SHARING: 'data_sharing',
  SUMMARY_SHARING: 'summary_sharing',
};

class ConsentService {
  /**
   * Ask for consent to share patient biodata with doctor
   */
  getDataSharingPrompt(patient) {
    return {
      type: CONSENT_TYPES.DATA_SHARING,
      question: 'Doctor needs some information to understand your condition.',
      details: `Do you allow me to share your:
  ✔ Name
  ✔ Age
  ✔ Hospital${patient.artNumber ? '\n  ✔ ART Number' : ''}
  ✔ State
  ✔ LGA

with the doctor?`,
      options: ['YES', 'NO'],
    };
  }

  /**
   * Ask for consent to share chat summary with doctor
   */
  getSummarySharingPrompt() {
    return {
      type: CONSENT_TYPES.SUMMARY_SHARING,
      question: 'Doctor accepted your consultation.',
      details: `Would you also like me to share a summary of our conversation to save time?`,
      options: ['YES', 'NO'],
    };
  }

  /**
   * Get the data that would be shared if consent granted
   */
  getShareableData(patient) {
    return {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      hospital: patient.hospital,
      state: patient.state,
      lga: patient.lga,
      artNumber: patient.diagnosis?.hiv ? patient.artNumber : undefined,
      fileNumber: patient.fileNumber || undefined,
      preferredConsultation: patient.preferredConsultation || undefined,
    };
  }

  /**
   * Record consent decision with audit trail
   */
  async recordConsent({ consultationId, patientId, type, granted, source, ip, userAgent }) {
    const update = {};
    const now = new Date();

    if (type === CONSENT_TYPES.DATA_SHARING) {
      update.consentDataShare = granted;
      update.consentDataShareAt = now;
    } else if (type === CONSENT_TYPES.SUMMARY_SHARING) {
      update.consentSummaryShare = granted;
      update.consentSummaryShareAt = now;
    }

    await AIConsultation.findByIdAndUpdate(consultationId, update);

    await AIConsentLog.create({
      patient: patientId,
      consultation: consultationId,
      type,
      granted,
      ip: ip || '',
      userAgent: userAgent || '',
      source: source || 'api',
    });

    logger.info(`Consent ${type} = ${granted} for consultation ${consultationId}`);

    return { granted, type };
  }

  /**
   * Get patient data filtered by consent level
   */
  getFilteredPatientData(patient, consentType) {
    if (consentType === CONSENT_TYPES.DATA_SHARING) {
      return {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        state: patient.state,
        lga: patient.lga,
        hospital: patient.hospital,
        artNumber: patient.diagnosis?.hiv ? patient.artNumber : undefined,
        fileNumber: patient.fileNumber || undefined,
      };
    }
    return {};
  }

  /**
   * Check if consent has been granted for a consultation
   */
  async checkConsent(consultationId, type) {
    const consultation = await AIConsultation.findById(consultationId).lean();
    if (!consultation) return false;

    if (type === CONSENT_TYPES.DATA_SHARING) return consultation.consentDataShare;
    if (type === CONSENT_TYPES.SUMMARY_SHARING) return consultation.consentSummaryShare;
    return false;
  }

  /**
   * Get full consent audit trail
   */
  async getAuditTrail(patientId) {
    return AIConsentLog.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .populate('consultation', 'status createdAt')
      .lean();
  }
}

module.exports = new ConsentService();
