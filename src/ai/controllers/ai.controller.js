const { getAIService } = require('../services');
const AIPatient = require('../models/AIPatient');
const AIChat = require('../models/AIChat');
const AIConsultation = require('../models/AIConsultation');
const AIDoctor = require('../models/AIDoctor');
const AIHospital = require('../models/AIHospital');
const ConsentService = require('../services/ConsentService');
const DoctorHandoffService = require('../services/DoctorHandoffService');
const HospitalFinderService = require('../services/HospitalFinderService');
const conversationCache = require('../services/ConversationCache');
const ProviderLogger = require('../services/ProviderLogger');
const { success, error } = require('../../utils/apiResponse');
const logger = require('../../utils/logger');

// ─── Chat ────────────────────────────────────────────────────────────
exports.chat = async (req, res, next) => {
  try {
    const ai = getAIService();
    const result = await ai.chat(req.body);
    return success(res, result);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('register first')) {
      return error(res, err.message, 404);
    }
    if (err.code === 'AI_PROVIDERS_EXHAUSTED') {
      return error(res, 'AI service temporarily unavailable. Please try again later.', 503);
    }
    next(err);
  }
};

// ─── Summary ─────────────────────────────────────────────────────────
exports.summary = async (req, res, next) => {
  try {
    const ai = getAIService();
    const result = await ai.summarize(req.body.chatId);
    return success(res, { chatId: req.body.chatId, summary: result });
  } catch (err) {
    next(err);
  }
};

// ─── Risk Assessment ─────────────────────────────────────────────────
exports.risk = async (req, res, next) => {
  try {
    const ai = getAIService();
    const result = await ai.riskAssessment(req.body.message, req.body.patientContext);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

// ─── Translate ───────────────────────────────────────────────────────
exports.translate = async (req, res, next) => {
  try {
    const ai = getAIService();
    const result = await ai.translate(req.body.text, req.body.targetLang, req.body.options);
    return success(res, {
      originalText: req.body.text,
      translatedText: result.content,
      targetLang: req.body.targetLang,
      provider: result.provider,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Provider Management ─────────────────────────────────────────────
exports.listProviders = async (req, res, next) => {
  try {
    const ai = getAIService();
    const providers = ai.getProviderStatus();
    return success(res, providers);
  } catch (err) {
    next(err);
  }
};

exports.switchProvider = async (req, res, next) => {
  try {
    const ai = getAIService();
    const available = Object.entries(ai.getProviderStatus())
      .filter(([, v]) => v.available)
      .map(([k]) => k);

    if (!available.includes(req.body.provider)) {
      return error(res, `Provider '${req.body.provider}' not available. Available: ${available.join(', ')}`, 400);
    }

    // Store preference in context cache
    if (req.body.patientId) {
      const context = conversationCache.getContext(req.body.patientId) || {};
      context.preferredProvider = req.body.provider;
      conversationCache.setContext(req.body.patientId, context);
    }

    return success(res, { provider: req.body.provider }, `Switched to ${req.body.provider}`);
  } catch (err) {
    next(err);
  }
};

// ─── Health ──────────────────────────────────────────────────────────
exports.health = async (req, res, next) => {
  try {
    const ai = getAIService();
    const cacheStats = conversationCache.getStats();
    const providerStatus = ai.getProviderStatus();

    return success(res, {
      status: 'healthy',
      providers: providerStatus,
      cache: cacheStats,
      uptime: process.uptime(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Patient ─────────────────────────────────────────────────────────
exports.registerPatient = async (req, res, next) => {
  try {
    const existing = req.body.phone
      ? await AIPatient.findOne({ phone: req.body.phone }).lean()
      : null;
    if (existing) return success(res, existing, 'Patient already registered');

    const patient = await AIPatient.create(req.body);
    logger.info(`AI Patient registered: ${patient.name} (${patient.phone})`);
    return success(res, patient, 'Patient registered', 201);
  } catch (err) {
    next(err);
  }
};

exports.getPatient = async (req, res, next) => {
  try {
    const patient = await AIPatient.findById(req.params.id)
      .populate('hospital preferredHospital')
      .populate('preferredDoctor', 'name specialization phone');
    if (!patient) return error(res, 'Patient not found', 404);
    return success(res, patient);
  } catch (err) {
    next(err);
  }
};

exports.findPatientByPhone = async (req, res, next) => {
  try {
    const patient = await AIPatient.findOne({ phone: req.params.phone })
      .populate('hospital preferredHospital')
      .populate('preferredDoctor', 'name specialization phone');
    if (!patient) return error(res, 'Patient not found', 404);
    return success(res, patient);
  } catch (err) {
    next(err);
  }
};

exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await AIPatient.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!patient) return error(res, 'Patient not found', 404);
    return success(res, patient, 'Patient updated');
  } catch (err) {
    next(err);
  }
};

// ─── Chat History ────────────────────────────────────────────────────
exports.getChatHistory = async (req, res, next) => {
  try {
    const chat = await AIChat.findById(req.params.id)
      .populate('patient', 'name phone age')
      .populate('doctorAssigned', 'name specialization');
    if (!chat) return error(res, 'Chat not found', 404);
    return success(res, chat);
  } catch (err) {
    next(err);
  }
};

exports.getPatientChats = async (req, res, next) => {
  try {
    const chats = await AIChat.find({ patient: req.params.patientId })
      .sort({ createdAt: -1 })
      .populate('doctorAssigned', 'name specialization');
    return success(res, chats);
  } catch (err) {
    next(err);
  }
};

// ─── Doctor ──────────────────────────────────────────────────────────
exports.registerDoctor = async (req, res, next) => {
  try {
    const existing = await AIDoctor.findOne({
      $or: [{ medicalLicense: req.body.medicalLicense }, { phone: req.body.phone }],
    });
    if (existing) return error(res, 'Doctor with that license or phone already exists', 409);

    const doctor = await AIDoctor.create(req.body);
    logger.info(`AI Doctor registered: ${doctor.name} (${doctor.phone})`);
    return success(res, doctor, 'Doctor registered', 201);
  } catch (err) {
    next(err);
  }
};

exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await AIDoctor.findById(req.params.id).populate('hospital', 'name state lga');
    if (!doctor) return error(res, 'Doctor not found', 404);
    return success(res, doctor);
  } catch (err) {
    next(err);
  }
};

exports.updateDoctor = async (req, res, next) => {
  try {
    const doctor = await AIDoctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!doctor) return error(res, 'Doctor not found', 404);
    return success(res, doctor, 'Doctor updated');
  } catch (err) {
    next(err);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const doctor = await AIDoctor.findByIdAndUpdate(
      req.params.id,
      { isAvailable: req.body.isAvailable, lastAvailabilityUpdate: new Date() },
      { new: true }
    );
    if (!doctor) return error(res, 'Doctor not found', 404);
    return success(res, doctor, 'Availability updated');
  } catch (err) {
    next(err);
  }
};

exports.getAvailableDoctors = async (req, res, next) => {
  try {
    const filter = { isAvailable: true };
    if (req.query.state) filter.state = new RegExp(`^${req.query.state}$`, 'i');
    if (req.query.specialization) filter.specialization = new RegExp(req.query.specialization, 'i');
    if (req.query.type) filter.consultationType = { $in: [req.query.type, 'both'] };

    const doctors = await AIDoctor.find(filter)
      .populate('hospital', 'name state lga')
      .sort({ yearsOfExperience: -1 });
    return success(res, doctors);
  } catch (err) {
    next(err);
  }
};

// ─── Hospital ────────────────────────────────────────────────────────
exports.registerHospital = async (req, res, next) => {
  try {
    const hospital = await AIHospital.create(req.body);
    return success(res, hospital, 'Hospital registered', 201);
  } catch (err) {
    next(err);
  }
};

exports.getHospitals = async (req, res, next) => {
  try {
    const result = await HospitalFinderService.findByLocation(req.query);
    return success(res, result.hospitals, 'Success', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

exports.getNearestHospitals = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return error(res, 'lat and lng query params required', 400);
    const result = await HospitalFinderService.findNearest({
      lat: parseFloat(lat), lng: parseFloat(lng),
      maxDistance: parseInt(req.query.maxDistance) || 10000,
    });
    return success(res, result.hospitals);
  } catch (err) {
    next(err);
  }
};

exports.getHospital = async (req, res, next) => {
  try {
    const hospital = await HospitalFinderService.getById(req.params.id);
    if (!hospital) return error(res, 'Hospital not found', 404);
    return success(res, hospital);
  } catch (err) {
    next(err);
  }
};

exports.getHospitalDoctors = async (req, res, next) => {
  try {
    const doctors = await HospitalFinderService.getDoctors(req.params.id);
    return success(res, doctors);
  } catch (err) {
    next(err);
  }
};

// ─── Consultation ────────────────────────────────────────────────────
exports.requestConsultation = async (req, res, next) => {
  try {
    const { patientId, chatId, type, hospitalId, doctorId } = req.body;

    const consultation = await AIConsultation.create({
      patient: patientId,
      chat: chatId || null,
      type: type || 'online',
      hospital: hospitalId || null,
      doctor: doctorId || null,
      status: 'pending',
    });

    logger.info(`Consultation requested: patient=${patientId} type=${type}`);
    return success(res, consultation, 'Consultation requested', 201);
  } catch (err) {
    next(err);
  }
};

exports.acceptConsultation = async (req, res, next) => {
  try {
    const result = await DoctorHandoffService.requestSummaryConsent(req.body.consultationId);
    return success(res, result, 'Consultation accepted');
  } catch (err) {
    next(err);
  }
};

exports.rejectConsultation = async (req, res, next) => {
  try {
    const consultation = await AIConsultation.findByIdAndUpdate(
      req.body.consultationId,
      { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Rejected by doctor' },
      { new: true }
    );
    if (!consultation) return error(res, 'Consultation not found', 404);
    return success(res, consultation, 'Consultation rejected');
  } catch (err) {
    next(err);
  }
};

exports.confirmConsultation = async (req, res, next) => {
  try {
    const consultation = await AIConsultation.findByIdAndUpdate(
      req.body.consultationId,
      { status: 'patient_confirmed', patientConfirmedAt: new Date() },
      { new: true }
    );
    if (!consultation) return error(res, 'Consultation not found', 404);
    return success(res, consultation, 'Consultation confirmed');
  } catch (err) {
    next(err);
  }
};

exports.startConsultation = async (req, res, next) => {
  try {
    const consultation = await AIConsultation.findByIdAndUpdate(
      req.body.consultationId,
      { status: 'in_progress', startedAt: new Date() },
      { new: true }
    );
    if (!consultation) return error(res, 'Consultation not found', 404);
    return success(res, consultation, 'Consultation started');
  } catch (err) {
    next(err);
  }
};

exports.endConsultation = async (req, res, next) => {
  try {
    const { consultationId, notes, prescription, labRequests } = req.body;
    const consultation = await AIConsultation.findByIdAndUpdate(
      consultationId,
      {
        status: 'completed', completedAt: new Date(),
        notes: notes || '', prescription: prescription || '', labRequests: labRequests || '',
      },
      { new: true }
    );
    if (!consultation) return error(res, 'Consultation not found', 404);

    if (consultation.chat) {
      await AIChat.findByIdAndUpdate(consultation.chat, { status: 'resolved' });
    }

    return success(res, consultation, 'Consultation completed');
  } catch (err) {
    next(err);
  }
};

exports.getConsultation = async (req, res, next) => {
  try {
    const consultation = await AIConsultation.findById(req.params.id)
      .populate('patient', 'name phone age gender')
      .populate('doctor', 'name specialization phone')
      .populate('hospital', 'name address phone')
      .populate('chat');
    if (!consultation) return error(res, 'Consultation not found', 404);
    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

exports.listConsultations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.patientId) filter.patient = req.query.patientId;
    if (req.query.doctorId) filter.doctor = req.query.doctorId;
    if (req.query.status) filter.status = req.query.status;

    const consultations = await AIConsultation.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'name phone')
      .populate('doctor', 'name specialization');
    return success(res, consultations);
  } catch (err) {
    next(err);
  }
};

// ─── Consent ─────────────────────────────────────────────────────────
exports.updateConsent = async (req, res, next) => {
  try {
    const { consultationId, consentType, granted, source } = req.body;
    const result = await ConsentService.recordConsent({
      consultationId,
      patientId: req.body.patientId,
      type: consentType,
      granted,
      source: source || 'api',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, result, `Consent ${granted ? 'granted' : 'denied'}`);
  } catch (err) {
    next(err);
  }
};

exports.getConsentLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.patientId) filter.patient = req.query.patientId;
    if (req.query.consultationId) filter.consultation = req.query.consultationId;

    const { AIConsentLog } = require('../models/AIConsentLog');
    const logs = await AIConsentLog.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'name phone');
    return success(res, logs);
  } catch (err) {
    next(err);
  }
};

// ─── Handoff ─────────────────────────────────────────────────────────
exports.getHandoffStatus = async (req, res, next) => {
  try {
    const status = await DoctorHandoffService.getHandoffStatus(req.params.id);
    if (!status) return error(res, 'Consultation not found', 404);
    return success(res, status);
  } catch (err) {
    next(err);
  }
};

exports.shareSummary = async (req, res, next) => {
  try {
    const result = await DoctorHandoffService.shareSummary(req.body.consultationId);
    return success(res, result, 'Summary shared with doctor');
  } catch (err) {
    next(err);
  }
};

// ─── Dashboard Stats ─────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalPatients, totalChats, totalConsultations, pendingConsultations,
      totalDoctors, availableDoctors, totalHospitals,
      activeChats, escalatedChats,
    ] = await Promise.all([
      AIPatient.countDocuments(),
      AIChat.countDocuments(),
      AIConsultation.countDocuments(),
      AIConsultation.countDocuments({ status: 'pending' }),
      AIDoctor.countDocuments(),
      AIDoctor.countDocuments({ isAvailable: true }),
      AIHospital.countDocuments({ isActive: true }),
      AIChat.countDocuments({ status: 'active' }),
      AIChat.countDocuments({ escalated: true }),
    ]);

    return success(res, {
      totalPatients, totalChats, activeChats, escalatedChats,
      totalConsultations, pendingConsultations,
      totalDoctors, availableDoctors, totalHospitals,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Provider Logs ───────────────────────────────────────────────────
exports.getProviderStats = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await ProviderLogger.getStats(days);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
};

// ─── Cache ───────────────────────────────────────────────────────────
exports.getCacheStats = async (req, res, next) => {
  return success(res, conversationCache.getStats());
};

exports.clearCache = async (req, res, next) => {
  conversationCache.clear();
  return success(res, null, 'Cache cleared');
};
