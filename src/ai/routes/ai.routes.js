const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const v = require('../validations/ai.validation');

// ─── Core AI Endpoints ───────────────────────────────────────────────
router.post('/chat', validate(v.chat), ctrl.chat);
router.post('/summary', protect, validate(v.summary), ctrl.summary);
router.post('/risk', validate(v.risk), ctrl.risk);
router.post('/translate', protect, validate(v.translate), ctrl.translate);

// ─── Provider Management ─────────────────────────────────────────────
router.post('/provider', protect, validate(v.switchProvider), ctrl.switchProvider);
router.get('/providers', ctrl.listProviders);
router.get('/health', ctrl.health);

// ─── Patient ─────────────────────────────────────────────────────────
router.post('/patient/register', validate(v.patientRegister), ctrl.registerPatient);
router.get('/patient/:id', protect, ctrl.getPatient);
router.get('/patient/phone/:phone', protect, ctrl.findPatientByPhone);
router.put('/patient/:id', protect, validate(v.patientRegister), ctrl.updatePatient);

// ─── Chat History ────────────────────────────────────────────────────
router.get('/chat/:id', protect, ctrl.getChatHistory);
router.get('/patient/:patientId/chats', protect, ctrl.getPatientChats);

// ─── Doctor ──────────────────────────────────────────────────────────
router.post('/doctor/register', validate(v.doctorRegister), ctrl.registerDoctor);
router.get('/doctor/available', ctrl.getAvailableDoctors);
router.get('/doctor/:id', ctrl.getDoctor);
router.put('/doctor/:id', protect, validate(v.doctorRegister), ctrl.updateDoctor);
router.patch('/doctor/:id/availability', protect, ctrl.updateAvailability);

// ─── Hospital ────────────────────────────────────────────────────────
router.post('/hospital', protect, ctrl.registerHospital);
router.get('/hospitals', ctrl.getHospitals);
router.get('/nearest-hospital', ctrl.getNearestHospitals);
router.get('/hospital/:id', ctrl.getHospital);
router.get('/hospital/:id/doctors', ctrl.getHospitalDoctors);

// ─── Consultation ────────────────────────────────────────────────────
router.post('/consultation/request', protect, validate(v.consultationRequest), ctrl.requestConsultation);
router.post('/consultation/accept', protect, validate(v.consultationAction), ctrl.acceptConsultation);
router.post('/consultation/reject', protect, validate(v.consultationAction), ctrl.rejectConsultation);
router.post('/consultation/confirm', protect, validate(v.consultationAction), ctrl.confirmConsultation);
router.post('/consultation/start', protect, validate(v.consultationAction), ctrl.startConsultation);
router.post('/consultation/end', protect, validate(v.consultationAction), ctrl.endConsultation);
router.get('/consultation/:id', protect, ctrl.getConsultation);
router.get('/consultations', protect, ctrl.listConsultations);
router.get('/handoff/:id', protect, ctrl.getHandoffStatus);
router.post('/handoff/share-summary', protect, validate(v.consultationAction), ctrl.shareSummary);

// ─── Consent ─────────────────────────────────────────────────────────
router.post('/consent', protect, validate(v.consentUpdate), ctrl.updateConsent);
router.get('/consent-logs', protect, ctrl.getConsentLogs);

// ─── Stats & Admin ───────────────────────────────────────────────────
router.get('/stats', protect, ctrl.getStats);
router.get('/provider-stats', protect, ctrl.getProviderStats);
router.get('/cache', protect, ctrl.getCacheStats);
router.delete('/cache', protect, ctrl.clearCache);

// ─── Prompt Management ──────────────────────────────────────────────
router.get('/prompts', protect, ctrl.listPrompts);
router.get('/prompts/:name', protect, ctrl.getPrompt);
router.put('/prompts/:name', protect, ctrl.savePrompt);
router.delete('/prompts/:name', protect, ctrl.deletePrompt);

// ─── Knowledge Management ───────────────────────────────────────────
router.get('/knowledge', protect, ctrl.listKnowledge);
router.post('/knowledge/reindex', protect, ctrl.reindexKnowledge);
router.post('/knowledge/reindex/:filename', protect, ctrl.reindexKnowledgeFile);
router.delete('/knowledge/:filename', protect, ctrl.deleteKnowledge);
router.get('/rag-stats', protect, ctrl.getRAGStats);

module.exports = router;
