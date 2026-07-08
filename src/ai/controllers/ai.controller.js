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
const { generateAccessToken } = require('../../utils/generateToken');
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

// ─── Doctor Auth ─────────────────────────────────────────────────────
exports.doctorLogin = async (req, res, next) => {
  try {
    const { identifier, phone, email, password } = req.body;
    const loginId = identifier || phone || email;
    if (!loginId || !password) return error(res, 'Phone/email and password required', 400);

    const query = loginId.includes('@') ? { email: loginId.toLowerCase().trim() } : { phone: loginId };
    const doctor = await AIDoctor.findOne(query).select('+password');
    if (!doctor) return error(res, 'Invalid credentials', 401);

    const valid = await doctor.comparePassword(password);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const token = generateAccessToken(doctor._id);
    logger.info(`Doctor login: ${doctor.name} (${doctor.phone})`);
    return success(res, {
      token,
      doctor: {
        _id: doctor._id,
        id: doctor._id,
        name: doctor.name,
        phone: doctor.phone,
        email: doctor.email,
        specialization: doctor.specialization,
        medicalLicense: doctor.medicalLicense,
        state: doctor.state,
        lga: doctor.lga,
        consultationType: doctor.consultationType,
        isAvailable: doctor.isAvailable,
        isVerified: doctor.isVerified,
        yearsOfExperience: doctor.yearsOfExperience,
        maxDailyPatients: doctor.maxDailyPatients,
        todayPatientCount: doctor.todayPatientCount,
      },
    }, 'Login successful');
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

    const doctorData = { ...req.body };
    if (!doctorData.password) delete doctorData.password;
    const doctor = await AIDoctor.create(doctorData);
    logger.info(`AI Doctor registered: ${doctor.name} (${doctor.phone})`);
    return success(res, {
      id: doctor._id,
      name: doctor.name,
      phone: doctor.phone,
      email: doctor.email,
    }, 'Doctor registered', 201);
  } catch (err) {
    next(err);
  }
};

exports.getMyDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await AIDoctor.findById(req.doctor._id)
      .populate('hospital', 'name state lga address phone');
    if (!doctor) return error(res, 'Doctor not found', 404);
    return success(res, doctor);
  } catch (err) {
    next(err);
  }
};

exports.getMyConsultations = async (req, res, next) => {
  try {
    const filter = { doctor: req.doctor._id };
    if (req.query.status) filter.status = req.query.status;

    const consultations = await AIConsultation.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'name phone age gender')
      .populate('hospital', 'name state lga')
      .populate('chat');
    return success(res, consultations);
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

// ─── Prompt Management ──────────────────────────────────────────────
exports.listPrompts = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const promptsDir = path.join(__dirname, '..', 'prompts');
    if (!fs.existsSync(promptsDir)) return success(res, []);
    const files = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));
    const prompts = files.map(f => {
      const content = fs.readFileSync(path.join(promptsDir, f), 'utf-8');
      const name = f.replace(/\.prompt\.md$/, '').replace(/\.md$/, '');
      return { name, filename: f, wordCount: content.split(/\s+/).length, preview: content.substring(0, 200) };
    });
    return success(res, prompts);
  } catch (err) {
    next(err);
  }
};

exports.getPrompt = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const promptsDir = path.join(__dirname, '..', 'prompts');
    const candidates = [
      path.join(promptsDir, `${req.params.name}.prompt.md`),
      path.join(promptsDir, `${req.params.name}.md`),
    ];
    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, 'utf-8');
        return success(res, { name: req.params.name, content, filePath: fp });
      }
    }
    return error(res, 'Prompt not found', 404);
  } catch (err) {
    next(err);
  }
};

exports.savePrompt = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { name, content } = req.body;
    if (!name || content === undefined) return error(res, 'name and content required', 400);
    const promptsDir = path.join(__dirname, '..', 'prompts');
    if (!fs.existsSync(promptsDir)) fs.mkdirSync(promptsDir, { recursive: true });
    const filePath = path.join(promptsDir, `${name}.prompt.md`);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`Prompt saved: ${name}.prompt.md`);
    return success(res, { name, filePath }, 'Prompt saved');
  } catch (err) {
    next(err);
  }
};

exports.deletePrompt = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const promptsDir = path.join(__dirname, '..', 'prompts');
    const candidates = [
      path.join(promptsDir, `${req.params.name}.prompt.md`),
      path.join(promptsDir, `${req.params.name}.md`),
    ];
    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        return success(res, null, 'Prompt deleted');
      }
    }
    return error(res, 'Prompt not found', 404);
  } catch (err) {
    next(err);
  }
};

// ─── Knowledge Management ───────────────────────────────────────────
exports.listKnowledge = async (req, res, next) => {
  try {
    const AIKnowledge = require('../models/AIKnowledge');
    const stats = await AIKnowledge.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$filename', chunks: { $sum: 1 }, totalWords: { $sum: { $ifNull: ['$metadata.wordCount', 0] } }, topic: { $first: '$topic' } } },
      { $sort: { _id: 1 } },
    ]);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
};

exports.reindexKnowledge = async (req, res, next) => {
  try {
    const ai = getAIService();
    const result = await ai.knowledgeService.indexAll();
    return success(res, result, 'Knowledge base re-indexed');
  } catch (err) {
    next(err);
  }
};

exports.reindexKnowledgeFile = async (req, res, next) => {
  try {
    const ai = getAIService();
    const result = await ai.knowledgeService.reindexFile(req.params.filename);
    return success(res, { chunks: result }, `Re-indexed ${req.params.filename}`);
  } catch (err) {
    next(err);
  }
};

exports.deleteKnowledge = async (req, res, next) => {
  try {
    const ai = getAIService();
    await ai.knowledgeService.removeKnowledge(req.params.filename);
    return success(res, null, `Knowledge '${req.params.filename}' deleted`);
  } catch (err) {
    next(err);
  }
};

exports.getRAGStats = async (req, res, next) => {
  try {
    const vectorStore = require('../services/VectorStore');
    const totalChunks = await vectorStore.count();
    const topics = await vectorStore.getTopics();
    const knowledgeFiles = require('fs').readdirSync(
      require('path').join(__dirname, '..', 'knowledge')
    ).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    return success(res, { totalChunks, topics, knowledgeFiles });
  } catch (err) {
    next(err);
  }
};

// ─── Patient Search ──────────────────────────────────────────────────
exports.searchPatients = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return success(res, []);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const patients = await AIPatient.find({
      $or: [
        { name: regex },
        { phone: regex },
        { artNumber: regex },
        { fileNumber: regex },
      ],
    })
      .populate('preferredDoctor', 'name specialization')
      .populate('preferredHospital', 'name')
      .limit(parseInt(req.query.limit) || 20)
      .lean();

    return success(res, patients);
  } catch (err) {
    next(err);
  }
};

// ─── Doctor Stats ────────────────────────────────────────────────────
exports.getMyDoctorStats = async (req, res, next) => {
  try {
    const doctorId = req.doctor._id;

    const [
      totalConsultations,
      pendingConsultations,
      completedConsultations,
      cancelledConsultations,
      activeConsultations,
      totalPatients,
      todayPatients,
      avgRating,
    ] = await Promise.all([
      AIConsultation.countDocuments({ doctor: doctorId }),
      AIConsultation.countDocuments({ doctor: doctorId, status: 'pending' }),
      AIConsultation.countDocuments({ doctor: doctorId, status: 'completed' }),
      AIConsultation.countDocuments({ doctor: doctorId, status: 'cancelled' }),
      AIConsultation.countDocuments({ doctor: doctorId, status: 'in_progress' }),
      AIConsultation.distinct('patient', { doctor: doctorId }).then(arr => arr.length),
      AIConsultation.countDocuments({
        doctor: doctorId,
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      0, // placeholder for rating
    ]);

    return success(res, {
      totalConsultations, pendingConsultations, completedConsultations,
      cancelledConsultations, activeConsultations, totalPatients,
      todayPatients, avgRating,
    });
  } catch (err) {
    next(err);
  }
};

// ─── AI Analyze Consultation ─────────────────────────────────────────
exports.aiAnalyzeConsultation = async (req, res, next) => {
  try {
    const { consultationId, patientId, symptoms, vitals, notes } = req.body;

    const ai = getAIService();
    const analysis = await ai.providerRouter.route('complex', {
      messages: [
        { role: 'system', content: 'You are a clinical AI assistant. Analyze the patient information and provide possible diagnoses, recommended tests, treatment suggestions, and risk level.' },
        { role: 'user', content: JSON.stringify({ patientId, symptoms, vitals, notes, consultationId }) },
      ],
    });

    return success(res, { analysis: analysis.content, provider: analysis.provider });
  } catch (err) {
    next(err);
  }
};

exports.getAiRecommendation = async (req, res, next) => {
  try {
    const consultation = await AIConsultation.findById(req.params.id)
      .populate('patient', 'name phone age gender')
      .lean();

    if (!consultation) return error(res, 'Consultation not found', 404);

    return success(res, {
      consultationId: consultation._id,
      patient: consultation.patient,
      notes: consultation.notes || '',
      prescription: consultation.prescription || '',
      labRequests: consultation.labRequests || '',
      status: consultation.status,
    });
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Prescriptions ──────────────────────────────────────────────
const EMRPrescription = require('../models/EMRPrescription');

exports.listPrescriptions = async (req, res, next) => {
  try {
    const filter = { doctor: req.doctor._id };
    if (req.query.patientId) filter.patient = req.query.patientId;
    if (req.query.status) filter.status = req.query.status;

    const prescriptions = await EMRPrescription.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'name phone')
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    return success(res, prescriptions);
  } catch (err) {
    next(err);
  }
};

exports.createPrescription = async (req, res, next) => {
  try {
    const data = { ...req.body, doctor: req.doctor._id };
    const prescription = await EMRPrescription.create(data);
    return success(res, prescription, 'Prescription created', 201);
  } catch (err) {
    next(err);
  }
};

exports.getPrescription = async (req, res, next) => {
  try {
    const prescription = await EMRPrescription.findById(req.params.id)
      .populate('patient', 'name phone age gender')
      .populate('doctor', 'name specialization')
      .lean();
    if (!prescription) return error(res, 'Prescription not found', 404);
    return success(res, prescription);
  } catch (err) {
    next(err);
  }
};

exports.updatePrescription = async (req, res, next) => {
  try {
    const prescription = await EMRPrescription.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!prescription) return error(res, 'Prescription not found', 404);
    return success(res, prescription, 'Prescription updated');
  } catch (err) {
    next(err);
  }
};

exports.deletePrescription = async (req, res, next) => {
  try {
    const prescription = await EMRPrescription.findByIdAndDelete(req.params.id);
    if (!prescription) return error(res, 'Prescription not found', 404);
    return success(res, null, 'Prescription deleted');
  } catch (err) {
    next(err);
  }
};

exports.sendPrescription = async (req, res, next) => {
  try {
    const prescription = await EMRPrescription.findByIdAndUpdate(
      req.params.id,
      { status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!prescription) return error(res, 'Prescription not found', 404);
    return success(res, prescription, 'Prescription sent');
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Lab Requests ───────────────────────────────────────────────
const EMRLabRequest = require('../models/EMRLabRequest');

exports.listLabRequests = async (req, res, next) => {
  try {
    const filter = { doctor: req.doctor._id };
    if (req.query.patientId) filter.patient = req.query.patientId;
    if (req.query.status) filter.status = req.query.status;

    const labRequests = await EMRLabRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'name phone')
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    return success(res, labRequests);
  } catch (err) {
    next(err);
  }
};

exports.createLabRequest = async (req, res, next) => {
  try {
    const data = { ...req.body, doctor: req.doctor._id };
    const labRequest = await EMRLabRequest.create(data);
    return success(res, labRequest, 'Lab request created', 201);
  } catch (err) {
    next(err);
  }
};

exports.getLabRequest = async (req, res, next) => {
  try {
    const labRequest = await EMRLabRequest.findById(req.params.id)
      .populate('patient', 'name phone age gender')
      .populate('doctor', 'name specialization')
      .lean();
    if (!labRequest) return error(res, 'Lab request not found', 404);
    return success(res, labRequest);
  } catch (err) {
    next(err);
  }
};

exports.updateLabRequest = async (req, res, next) => {
  try {
    const labRequest = await EMRLabRequest.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!labRequest) return error(res, 'Lab request not found', 404);
    return success(res, labRequest, 'Lab request updated');
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Referrals ──────────────────────────────────────────────────
const EMRReferral = require('../models/EMRReferral');

exports.listReferrals = async (req, res, next) => {
  try {
    const filter = { referringDoctor: req.doctor._id };
    if (req.query.patientId) filter.patient = req.query.patientId;
    if (req.query.status) filter.status = req.query.status;

    const referrals = await EMRReferral.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'name phone')
      .populate('toHospital', 'name state lga')
      .populate('toDoctor', 'name specialization')
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    return success(res, referrals);
  } catch (err) {
    next(err);
  }
};

exports.createReferral = async (req, res, next) => {
  try {
    const data = { ...req.body, referringDoctor: req.doctor._id };
    const referral = await EMRReferral.create(data);
    return success(res, referral, 'Referral created', 201);
  } catch (err) {
    next(err);
  }
};

exports.getReferral = async (req, res, next) => {
  try {
    const referral = await EMRReferral.findById(req.params.id)
      .populate('patient', 'name phone age gender')
      .populate('referringDoctor', 'name specialization phone')
      .populate('toHospital', 'name state lga address phone')
      .populate('toDoctor', 'name specialization')
      .lean();
    if (!referral) return error(res, 'Referral not found', 404);
    return success(res, referral);
  } catch (err) {
    next(err);
  }
};

exports.updateReferralStatus = async (req, res, next) => {
  try {
    const referral = await EMRReferral.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!referral) return error(res, 'Referral not found', 404);
    return success(res, referral, 'Referral status updated');
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Medical Records ────────────────────────────────────────────
const EMRMedicalRecord = require('../models/EMRMedicalRecord');

exports.listMedicalRecords = async (req, res, next) => {
  try {
    const filter = { patient: req.params.patientId };
    const records = await EMRMedicalRecord.find(filter)
      .sort({ createdAt: -1 })
      .populate('doctor', 'name specialization')
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    return success(res, records);
  } catch (err) {
    next(err);
  }
};

exports.createMedicalRecord = async (req, res, next) => {
  try {
    const data = { ...req.body, doctor: req.doctor._id };
    const record = await EMRMedicalRecord.create(data);
    return success(res, record, 'Medical record created', 201);
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Messages ───────────────────────────────────────────────────
const EMRMessage = require('../models/EMRMessage');

exports.listMessages = async (req, res, next) => {
  try {
    const doctorId = req.doctor._id;
    const filter = {
      $or: [{ sender: doctorId }, { recipient: doctorId }],
    };

    if (req.query.patientId) filter.patient = req.query.patientId;

    const messages = await EMRMessage.find(filter)
      .sort({ createdAt: -1 })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .populate('patient', 'name phone')
      .limit(parseInt(req.query.limit) || 100)
      .lean();

    return success(res, messages);
  } catch (err) {
    next(err);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const doctorId = req.doctor._id;
    const messages = await EMRMessage.find({
      $or: [
        { sender: doctorId, recipient: req.params.otherUserId },
        { sender: req.params.otherUserId, recipient: doctorId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .limit(parseInt(req.query.limit) || 100)
      .lean();

    return success(res, messages);
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const data = { ...req.body, sender: req.doctor._id };
    const message = await EMRMessage.create(data);
    const populated = await EMRMessage.findById(message._id)
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .lean();
    return success(res, populated, 'Message sent', 201);
  } catch (err) {
    next(err);
  }
};

exports.markMessageRead = async (req, res, next) => {
  try {
    const message = await EMRMessage.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!message) return error(res, 'Message not found', 404);
    return success(res, message, 'Message marked as read');
  } catch (err) {
    next(err);
  }
};

exports.unreadMessageCount = async (req, res, next) => {
  try {
    const count = await EMRMessage.countDocuments({
      recipient: req.doctor._id,
      read: false,
    });
    return success(res, { count });
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Appointments ───────────────────────────────────────────────
const EMRAppointment = require('../models/EMRAppointment');

exports.listAppointments = async (req, res, next) => {
  try {
    const filter = { doctor: req.doctor._id };
    if (req.query.patientId) filter.patient = req.query.patientId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const d = new Date(req.query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    const appointments = await EMRAppointment.find(filter)
      .sort({ date: -1 })
      .populate('patient', 'name phone age gender')
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    return success(res, appointments);
  } catch (err) {
    next(err);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const data = { ...req.body, doctor: req.doctor._id };
    const appointment = await EMRAppointment.create(data);
    return success(res, appointment, 'Appointment created', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointment = await EMRAppointment.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!appointment) return error(res, 'Appointment not found', 404);
    return success(res, appointment, 'Appointment status updated');
  } catch (err) {
    next(err);
  }
};

// ─── EMR: Notifications ──────────────────────────────────────────────
const EMRNotification = require('../models/EMRNotification');

exports.listNotifications = async (req, res, next) => {
  try {
    const filter = { recipient: req.doctor._id };
    const notifications = await EMRNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    return success(res, notifications);
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const notification = await EMRNotification.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return error(res, 'Notification not found', 404);
    return success(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await EMRNotification.updateMany(
      { recipient: req.doctor._id, read: false },
      { read: true, readAt: new Date() }
    );
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

exports.unreadNotificationCount = async (req, res, next) => {
  try {
    const count = await EMRNotification.countDocuments({
      recipient: req.doctor._id,
      read: false,
    });
    return success(res, { count });
  } catch (err) {
    next(err);
  }
};

// ─── HIV Clinical Care ───────────────────────────────────────────────
const AIHIVRecord = require('../models/AIHIVRecord');

exports.getHIVRecord = async (req, res, next) => {
  try {
    let record = await AIHIVRecord.findOne({ patient: req.params.patientId }).lean();
    if (!record) {
      const AIHIVRecord = require('../models/AIHIVRecord');
      record = await AIHIVRecord.create({ patient: req.params.patientId });
    }
    return success(res, record);
  } catch (err) {
    next(err);
  }
};

exports.updateHIVRecord = async (req, res, next) => {
  try {
    const data = { ...req.body, lastUpdatedBy: req.doctor._id, lastUpdatedAt: new Date() };
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      data,
      { new: true, upsert: true, runValidators: true }
    );
    return success(res, record, 'HIV record updated');
  } catch (err) {
    next(err);
  }
};

exports.addViralLoad = async (req, res, next) => {
  try {
    const entry = { ...req.body, collectionDate: req.body.collectionDate || new Date() };
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      {
        $push: { viralLoads: entry },
        $set: {
          latestViralLoad: req.body.value,
          latestViralLoadDate: req.body.collectionDate || new Date(),
          latestViralLoadStatus: req.body.status || 'unknown',
          lastUpdatedBy: req.doctor._id,
          lastUpdatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    return success(res, record, 'Viral load recorded');
  } catch (err) {
    next(err);
  }
};

exports.addCD4 = async (req, res, next) => {
  try {
    const entry = { ...req.body, date: req.body.date || new Date() };
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      {
        $push: { cd4History: entry },
        $set: {
          latestCD4: req.body.value,
          latestCD4Date: req.body.date || new Date(),
          lastUpdatedBy: req.doctor._id,
          lastUpdatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    const all = await AIHIVRecord.findOne({ patient: req.params.patientId }).lean();
    if (all?.cd4History?.length) {
      const vals = all.cd4History.map(c => c.value).filter(Boolean);
      await AIHIVRecord.findOneAndUpdate(
        { patient: req.params.patientId },
        { lowestCD4: Math.min(...vals), highestCD4: Math.max(...vals) }
      );
    }
    return success(res, record, 'CD4 recorded');
  } catch (err) {
    next(err);
  }
};

exports.addRegimen = async (req, res, next) => {
  try {
    const entry = {
      ...req.body,
      startDate: req.body.startDate || new Date(),
      isCurrent: true,
    };
    await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      { $set: { 'previousRegimens.$[].isCurrent': false } }
    );
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      {
        $push: { previousRegimens: entry },
        $set: {
          currentRegimen: req.body.regimen,
          currentLineOfTreatment: req.body.lineOfTreatment || '',
          lastUpdatedBy: req.doctor._id,
          lastUpdatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    return success(res, record, 'Regimen recorded');
  } catch (err) {
    next(err);
  }
};

exports.addOI = async (req, res, next) => {
  try {
    const entry = { ...req.body, diagnosisDate: req.body.diagnosisDate || new Date() };
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      {
        $push: { opportunisticInfections: entry },
        $set: { lastUpdatedBy: req.doctor._id, lastUpdatedAt: new Date() },
      },
      { new: true, upsert: true }
    );
    return success(res, record, 'OI recorded');
  } catch (err) {
    next(err);
  }
};

exports.addMedication = async (req, res, next) => {
  try {
    const entry = { ...req.body, prescribedBy: req.doctor._id, startDate: req.body.startDate || new Date(), isActive: true };
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      {
        $push: { currentMedications: entry },
        $set: { lastUpdatedBy: req.doctor._id, lastUpdatedAt: new Date() },
      },
      { new: true, upsert: true }
    );
    return success(res, record, 'Medication recorded');
  } catch (err) {
    next(err);
  }
};

exports.addHIVLabResult = async (req, res, next) => {
  try {
    const entry = { ...req.body, date: req.body.date || new Date() };
    const record = await AIHIVRecord.findOneAndUpdate(
      { patient: req.params.patientId },
      {
        $push: { labResults: entry },
        $set: { lastUpdatedBy: req.doctor._id, lastUpdatedAt: new Date() },
      },
      { new: true, upsert: true }
    );
    return success(res, record, 'Lab result recorded');
  } catch (err) {
    next(err);
  }
};

exports.hivAiAnalyze = async (req, res, next) => {
  try {
    const { patientId, consultationId, symptoms, notes } = req.body;
    const record = await AIHIVRecord.findOne({ patient: patientId }).lean();
    const patient = await require('../models/AIPatient').findById(patientId).lean();

    const hivContext = {
      artNumber: record?.artNumber || patient?.artNumber,
      currentRegimen: record?.currentRegimen,
      latestViralLoad: record?.latestViralLoad,
      latestViralLoadStatus: record?.latestViralLoadStatus,
      latestCD4: record?.latestCD4,
      medicationAdherence: record?.medicationAdherence,
      adherenceScore: record?.adherenceScore,
      ois: record?.opportunisticInfections?.filter(oi => oi.type === 'current').map(oi => oi.name),
      allergies: record?.allergies?.filter(a => a.severity === 'severe' || a.severity === 'critical').map(a => a.name),
      currentMeds: record?.currentMedications?.filter(m => m.isActive).map(m => m.name),
    };

    const ai = getAIService();
    const analysis = await ai.providerRouter.route('complex', {
      messages: [
        {
          role: 'system',
          content: `You are an HIV specialist AI clinical assistant. Analyze the patient data and provide:
1. possibleCauses: array of possible causes for current symptoms
2. suggestedInvestigations: array of recommended tests
3. adherenceRecommendations: adherence counselling advice
4. lifestyleAdvice: lifestyle recommendations
5. referralRecommendations: referral suggestions
6. suggestedFollowUpInterval: string with follow-up timing
7. medicationSuggestions: array of {name, reason, dosage, frequency, duration, sideEffects, drugInteractions, alternatives}
8. clinicalAlerts: array of {type: 'green'|'yellow'|'orange'|'red', message, reason}
9. patientEducation: patient education content
Respond as JSON only.`,
        },
        { role: 'user', content: JSON.stringify({ symptoms, notes, hivContext, consultationId }) },
      ],
    });

    return success(res, {
      analysis: analysis.content,
      provider: analysis.provider,
      hivContext,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Reference Data ──────────────────────────────────────────────────
const { states, lgas, specializations, hospitalDepartments } = require('../data/nigeria');

exports.getStates = async (req, res, next) => {
  return success(res, states);
};

exports.getLGAs = async (req, res, next) => {
  const stateLgas = lgas[req.params.state];
  if (!stateLgas) return error(res, 'State not found', 404);
  return success(res, stateLgas);
};

exports.getSpecializations = async (req, res, next) => {
  return success(res, specializations);
};

exports.getHospitalDepartments = async (req, res, next) => {
  return success(res, hospitalDepartments);
};

// ─── Global Search ───────────────────────────────────────────────────
exports.globalSearch = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return success(res, { patients: [], doctors: [], consultations: [] });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [patients, doctors, consultations] = await Promise.all([
      AIPatient.find({
        $or: [{ name: regex }, { phone: regex }, { artNumber: regex }, { fileNumber: regex }],
      }).limit(10).lean(),
      AIDoctor.find({
        $or: [{ name: regex }, { phone: regex }, { specialization: regex }],
      }).select('-password').limit(10).lean(),
      AIConsultation.find({ 'patient': { $exists: true } })
        .populate('patient', 'name phone')
        .limit(10).lean(),
    ]);

    return success(res, { patients, doctors, consultations });
  } catch (err) {
    next(err);
  }
};

// ─── Analytics ───────────────────────────────────────────────────────
const getDateRange = (period) => {
  const now = new Date();
  let start;
  if (period === 'thisMonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'lastMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (period === 'last7') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { start, end: now };
};

exports.weeklyConsultations = async (req, res, next) => {
  try {
    const { start, end } = getDateRange('last7');
    const consultations = await AIConsultation.find({
      doctor: req.doctor._id,
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: 1 }).lean();

    const daily = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      daily[key] = 0;
    }
    consultations.forEach(c => {
      const key = new Date(c.createdAt).toISOString().split('T')[0];
      if (daily[key] !== undefined) daily[key]++;
    });

    const labels = Object.keys(daily);
    const values = Object.values(daily);
    const total = values.reduce((a, b) => a + b, 0);

    return success(res, { labels, values, total });
  } catch (err) {
    next(err);
  }
};

exports.monthlyConsultations = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const consultations = await AIConsultation.find({
      doctor: req.doctor._id,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59),
      },
    }).lean();

    const monthly = Array(12).fill(0);
    consultations.forEach(c => {
      const m = new Date(c.createdAt).getMonth();
      monthly[m]++;
    });

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const total = monthly.reduce((a, b) => a + b, 0);

    return success(res, { labels, values: monthly, total });
  } catch (err) {
    next(err);
  }
};

exports.patientDemographics = async (req, res, next) => {
  try {
    const doctorId = req.doctor._id;
    const patientIds = await AIConsultation.distinct('patient', { doctor: doctorId });
    const patients = await AIPatient.find({ _id: { $in: patientIds } }).lean();

    const gender = { male: 0, female: 0, other: 0 };
    const ageGroups = { '0-17': 0, '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };

    patients.forEach(p => {
      if (p.gender && gender[p.gender] !== undefined) gender[p.gender]++;
      if (p.age) {
        if (p.age <= 17) ageGroups['0-17']++;
        else if (p.age <= 35) ageGroups['18-35']++;
        else if (p.age <= 50) ageGroups['36-50']++;
        else if (p.age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      }
    });

    return success(res, { totalPatients: patients.length, gender, ageGroups });
  } catch (err) {
    next(err);
  }
};

exports.consultationTypes = async (req, res, next) => {
  try {
    const result = await AIConsultation.aggregate([
      { $match: { doctor: req.doctor._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const types = { online: 0, 'in-person': 0 };
    result.forEach(r => { if (types[r._id] !== undefined) types[r._id] = r.count; });
    const total = Object.values(types).reduce((a, b) => a + b, 0);

    return success(res, { types, total });
  } catch (err) {
    next(err);
  }
};

exports.commonDiseases = async (req, res, next) => {
  try {
    const records = await EMRMedicalRecord.aggregate([
      { $match: { doctor: req.doctor._id, diagnosis: { $exists: true, $ne: '' } } },
      { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const labels = records.map(r => r._id);
    const values = records.map(r => r.count);

    return success(res, { labels, values });
  } catch (err) {
    next(err);
  }
};

exports.revenueAnalytics = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req.query.period);
    const consultations = await AIConsultation.find({
      doctor: req.doctor._id,
      status: 'completed',
      completedAt: { $gte: start, $lte: end },
    }).lean();

    const doctor = await AIDoctor.findById(req.doctor._id).lean();
    const fee = doctor?.consultationFee || 0;
    const totalRevenue = consultations.length * fee;

    return success(res, {
      totalConsultations: consultations.length,
      feePerConsultation: fee,
      totalRevenue,
      period: { start, end },
    });
  } catch (err) {
    next(err);
  }
};
