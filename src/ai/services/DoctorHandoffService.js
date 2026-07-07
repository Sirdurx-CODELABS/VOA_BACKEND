/**
 * DoctorHandoffService — Manages the doctor handoff process:
 * consent → doctor notified → doctor accepts → summary shared → doctor reviews
 */

const AIPatient = require('../models/AIPatient');
const AIChat = require('../models/AIChat');
const AIConsultation = require('../models/AIConsultation');
const AIDoctor = require('../models/AIDoctor');
const ConsentService = require('./ConsentService');
const SummaryService = require('./SummaryService');
const logger = require('../../utils/logger');

class DoctorHandoffService {
  /**
   * Initiate handoff: generate prompt, ask first consent
   */
  async initiateHandoff(patient, chat, consultation, riskResult) {
    const consentPrompt = ConsentService.getDataSharingPrompt(patient);

    return {
      step: 'consent_data',
      consultationId: consultation._id,
      prompt: consentPrompt,
      riskLevel: riskResult.level,
      riskScore: riskResult.score,
    };
  }

  /**
   * After consent granted, notify doctor with patient data
   */
  async notifyDoctor(consultationId) {
    const consultation = await AIConsultation.findById(consultationId)
      .populate('patient')
      .populate('doctor');

    if (!consultation || !consultation.consentDataShare) {
      throw new Error('Cannot notify doctor: consent not granted or consultation not found');
    }

    const patientData = ConsentService.getFilteredPatientData(
      consultation.patient,
      'data_sharing'
    );

    logger.info(`Doctor ${consultation.doctor?.name} notified for patient ${consultation.patient?.name}`);

    return {
      doctorId: consultation.doctor?._id,
      doctorName: consultation.doctor?.name,
      patientData,
      consultationId: consultation._id,
      status: consultation.status,
    };
  }

  /**
   * After doctor accepts, request second consent for summary sharing
   */
  async requestSummaryConsent(consultationId) {
    const consultation = await AIConsultation.findById(consultationId).populate('chat');
    if (!consultation) throw new Error('Consultation not found');

    // Accept the consultation
    consultation.status = 'doctor_accepted';
    consultation.doctorAcceptedAt = new Date();
    await consultation.save();

    const summaryPrompt = ConsentService.getSummarySharingPrompt();

    return {
      step: 'consent_summary',
      consultationId: consultation._id,
      prompt: summaryPrompt,
    };
  }

  /**
   * Generate and share clinical summary with doctor
   */
  async shareSummary(consultationId) {
    const consultation = await AIConsultation.findById(consultationId)
      .populate('patient')
      .populate('chat');

    if (!consultation || !consultation.consentSummaryShare) {
      throw new Error('Cannot share summary: consent not granted');
    }

    // Generate AI summary
    const summary = await SummaryService.generateClinicalSummary(
      consultation.chat,
      consultation.patient
    );

    // Store summary in consultation
    consultation.aiSummary = {
      symptoms: summary.symptoms || '',
      timeline: summary.timeline || '',
      currentMedication: summary.currentMedication || '',
      concerns: summary.concerns || '',
      riskAssessment: summary.riskAssessment || '',
      recommendations: summary.recommendations || '',
    };
    consultation.status = 'patient_confirmed';
    consultation.patientConfirmedAt = new Date();
    await consultation.save();

    logger.info(`Summary shared for consultation ${consultationId}`);

    return {
      consultationId: consultation._id,
      summary: consultation.aiSummary,
      patientName: consultation.patient?.name,
    };
  }

  /**
   * Get handoff status for a consultation
   */
  async getHandoffStatus(consultationId) {
    const consultation = await AIConsultation.findById(consultationId)
      .populate('patient', 'name phone age')
      .populate('doctor', 'name specialization phone')
      .populate('chat');

    if (!consultation) return null;

    return {
      consultationId: consultation._id,
      status: consultation.status,
      type: consultation.type,
      patient: consultation.patient,
      doctor: consultation.doctor,
      consentDataShare: consultation.consentDataShare,
      consentSummaryShare: consultation.consentSummaryShare,
      aiSummary: consultation.aiSummary,
      timeline: {
        requested: consultation.createdAt,
        doctorAccepted: consultation.doctorAcceptedAt,
        patientConfirmed: consultation.patientConfirmedAt,
        started: consultation.startedAt,
        completed: consultation.completedAt,
      },
    };
  }
}

module.exports = new DoctorHandoffService();
