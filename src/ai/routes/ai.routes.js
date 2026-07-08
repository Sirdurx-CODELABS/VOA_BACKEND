const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const { protect } = require('../../middleware/auth');
const { doctorProtect } = require('../middleware/doctorAuth');
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
router.get('/patient/search', doctorProtect, ctrl.searchPatients);
router.get('/patient/:id', ctrl.getPatient);
router.get('/patient/phone/:phone', ctrl.findPatientByPhone);
router.put('/patient/:id', ctrl.updatePatient);

// ─── Chat History ────────────────────────────────────────────────────
router.get('/chat/:id', protect, ctrl.getChatHistory);
router.get('/patient/:patientId/chats', protect, ctrl.getPatientChats);

// ─── Doctor Auth ──────────────────────────────────────────────────────
router.post('/doctor/login', ctrl.doctorLogin);

// ─── Doctor ──────────────────────────────────────────────────────────
router.post('/doctor/register', validate(v.doctorRegister), ctrl.registerDoctor);
router.get('/doctor/available', ctrl.getAvailableDoctors);
router.get('/doctor/me', doctorProtect, ctrl.getMyDoctorProfile);
router.get('/doctor/stats', doctorProtect, ctrl.getMyDoctorStats);
router.get('/doctor/consultations', doctorProtect, ctrl.getMyConsultations);
router.get('/doctor/:id', ctrl.getDoctor);
router.put('/doctor/:id', doctorProtect, validate(v.doctorUpdate), ctrl.updateDoctor);
router.patch('/doctor/:id/availability', doctorProtect, ctrl.updateAvailability);

// ─── Hospital ────────────────────────────────────────────────────────
router.post('/hospital', ctrl.registerHospital);
router.get('/hospitals', ctrl.getHospitals);
router.get('/nearest-hospital', ctrl.getNearestHospitals);
router.get('/hospital/:id', ctrl.getHospital);
router.get('/hospital/:id/doctors', ctrl.getHospitalDoctors);

// ─── Consultation ────────────────────────────────────────────────────
router.post('/consultation/request', validate(v.consultationRequest), ctrl.requestConsultation);
router.post('/consultation/accept', doctorProtect, validate(v.consultationAction), ctrl.acceptConsultation);
router.post('/consultation/reject', doctorProtect, validate(v.consultationAction), ctrl.rejectConsultation);
router.post('/consultation/confirm', protect, validate(v.consultationAction), ctrl.confirmConsultation);
router.post('/consultation/start', doctorProtect, validate(v.consultationAction), ctrl.startConsultation);
router.post('/consultation/end', doctorProtect, validate(v.consultationAction), ctrl.endConsultation);
router.get('/consultation/:id', ctrl.getConsultation);
router.get('/consultations', ctrl.listConsultations);
router.post('/consultation/ai-analyze', doctorProtect, ctrl.aiAnalyzeConsultation);
router.get('/consultation/:id/ai-recommendation', ctrl.getAiRecommendation);
router.get('/handoff/:id', protect, ctrl.getHandoffStatus);
router.post('/handoff/share-summary', protect, validate(v.consultationAction), ctrl.shareSummary);

// ─── Consent ─────────────────────────────────────────────────────────
router.post('/consent', protect, validate(v.consentUpdate), ctrl.updateConsent);
router.get('/consent-logs', protect, ctrl.getConsentLogs);

// ─── EMR: Prescriptions ──────────────────────────────────────────────
router.get('/prescriptions', doctorProtect, ctrl.listPrescriptions);
router.post('/prescription', doctorProtect, ctrl.createPrescription);
router.get('/prescription/:id', doctorProtect, ctrl.getPrescription);
router.put('/prescription/:id', doctorProtect, ctrl.updatePrescription);
router.delete('/prescription/:id', doctorProtect, ctrl.deletePrescription);
router.post('/prescription/:id/send', doctorProtect, ctrl.sendPrescription);

// ─── EMR: Lab Requests ───────────────────────────────────────────────
router.get('/lab-requests', doctorProtect, ctrl.listLabRequests);
router.post('/lab-request', doctorProtect, ctrl.createLabRequest);
router.get('/lab-request/:id', doctorProtect, ctrl.getLabRequest);
router.put('/lab-request/:id', doctorProtect, ctrl.updateLabRequest);

// ─── EMR: Referrals ──────────────────────────────────────────────────
router.get('/referrals', doctorProtect, ctrl.listReferrals);
router.post('/referral', doctorProtect, ctrl.createReferral);
router.get('/referral/:id', doctorProtect, ctrl.getReferral);
router.patch('/referral/:id/status', doctorProtect, ctrl.updateReferralStatus);

// ─── EMR: Medical Records ────────────────────────────────────────────
router.get('/patient/:patientId/medical-records', doctorProtect, ctrl.listMedicalRecords);
router.post('/medical-record', doctorProtect, ctrl.createMedicalRecord);

// ─── EMR: Messages ───────────────────────────────────────────────────
router.get('/messages', doctorProtect, ctrl.listMessages);
router.get('/messages/conversation/:otherUserId', doctorProtect, ctrl.getConversation);
router.post('/messages/send', doctorProtect, ctrl.sendMessage);
router.patch('/messages/:id/read', doctorProtect, ctrl.markMessageRead);
router.get('/messages/unread-count', doctorProtect, ctrl.unreadMessageCount);

// ─── EMR: Appointments ───────────────────────────────────────────────
router.get('/appointments', doctorProtect, ctrl.listAppointments);
router.post('/appointment', doctorProtect, ctrl.createAppointment);
router.patch('/appointment/:id/status', doctorProtect, ctrl.updateAppointmentStatus);

// ─── EMR: Notifications ──────────────────────────────────────────────
router.get('/notifications', doctorProtect, ctrl.listNotifications);
router.patch('/notifications/:id/read', doctorProtect, ctrl.markNotificationRead);
router.post('/notifications/mark-all-read', doctorProtect, ctrl.markAllNotificationsRead);
router.get('/notifications/unread-count', doctorProtect, ctrl.unreadNotificationCount);

// ─── Analytics ───────────────────────────────────────────────────────
router.get('/analytics/weekly-consultations', doctorProtect, ctrl.weeklyConsultations);
router.get('/analytics/monthly-consultations', doctorProtect, ctrl.monthlyConsultations);
router.get('/analytics/patient-demographics', doctorProtect, ctrl.patientDemographics);
router.get('/analytics/consultation-types', doctorProtect, ctrl.consultationTypes);
router.get('/analytics/common-diseases', doctorProtect, ctrl.commonDiseases);
router.get('/analytics/revenue', doctorProtect, ctrl.revenueAnalytics);

// ─── HIV Clinical Care ───────────────────────────────────────────────
router.get('/hiv/record/:patientId', doctorProtect, ctrl.getHIVRecord);
router.put('/hiv/record/:patientId', doctorProtect, ctrl.updateHIVRecord);
router.post('/hiv/viral-load/:patientId', doctorProtect, ctrl.addViralLoad);
router.post('/hiv/cd4/:patientId', doctorProtect, ctrl.addCD4);
router.post('/hiv/regimen/:patientId', doctorProtect, ctrl.addRegimen);
router.post('/hiv/oi/:patientId', doctorProtect, ctrl.addOI);
router.post('/hiv/medication/:patientId', doctorProtect, ctrl.addMedication);
router.post('/hiv/lab-result/:patientId', doctorProtect, ctrl.addHIVLabResult);
router.post('/hiv/ai-analyze', doctorProtect, ctrl.hivAiAnalyze);

// ─── Reference Data ──────────────────────────────────────────────────
router.get('/reference/states', ctrl.getStates);
router.get('/reference/lgas/:state', ctrl.getLGAs);
router.get('/reference/specializations', ctrl.getSpecializations);
router.get('/reference/departments', ctrl.getHospitalDepartments);
router.get('/search', ctrl.globalSearch);

// ─── Stats & Admin ───────────────────────────────────────────────────
router.get('/stats', ctrl.getStats);
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
