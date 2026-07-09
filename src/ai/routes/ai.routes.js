const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const { protect, requirePermission } = require('../../middleware/auth');
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
router.get('/patient/search', protect, requirePermission('view_patient'), ctrl.searchPatients);
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
router.get('/doctor/me', protect, ctrl.getMyDoctorProfile);
router.get('/doctor/stats', protect, ctrl.getMyDoctorStats);
router.get('/doctor/consultations', protect, ctrl.getMyConsultations);
router.put('/doctor/:id', protect, requirePermission('edit_own_profile'), validate(v.doctorUpdate), ctrl.updateDoctor);
router.patch('/doctor/:id/availability', protect, requirePermission('manage_schedule'), ctrl.updateAvailability);

// ─── Hospital ────────────────────────────────────────────────────────
router.post('/hospital', ctrl.registerHospital);
router.get('/hospitals', ctrl.getHospitals);
router.get('/nearest-hospital', ctrl.getNearestHospitals);
router.get('/hospital/:id', ctrl.getHospital);
router.get('/hospital/:id/doctors', ctrl.getHospitalDoctors);

// ─── Consultation ────────────────────────────────────────────────────
router.post('/consultation/request', validate(v.consultationRequest), ctrl.requestConsultation);
router.post('/consultation/accept', protect, requirePermission('approve_consultation'), validate(v.consultationAction), ctrl.acceptConsultation);
router.post('/consultation/reject', protect, requirePermission('approve_consultation'), validate(v.consultationAction), ctrl.rejectConsultation);
router.post('/consultation/confirm', protect, validate(v.consultationAction), ctrl.confirmConsultation);
router.post('/consultation/start', protect, requirePermission('conduct_consultation'), validate(v.consultationAction), ctrl.startConsultation);
router.post('/consultation/end', protect, requirePermission('conduct_consultation'), validate(v.consultationAction), ctrl.endConsultation);
router.get('/consultation/:id', ctrl.getConsultation);
router.get('/consultations', ctrl.listConsultations);
router.post('/consultation/ai-analyze', protect, requirePermission('conduct_consultation'), ctrl.aiAnalyzeConsultation);
router.get('/consultation/:id/ai-recommendation', ctrl.getAiRecommendation);
router.get('/handoff/:id', protect, ctrl.getHandoffStatus);
router.post('/handoff/share-summary', protect, validate(v.consultationAction), ctrl.shareSummary);

// ─── Consent ─────────────────────────────────────────────────────────
router.post('/consent', protect, validate(v.consentUpdate), ctrl.updateConsent);
router.get('/consent-logs', protect, ctrl.getConsentLogs);

// ─── EMR: Prescriptions ──────────────────────────────────────────────
router.get('/prescriptions', protect, requirePermission('view_prescriptions'), ctrl.listPrescriptions);
router.post('/prescription', protect, requirePermission('create_prescription'), ctrl.createPrescription);
router.get('/prescription/:id', protect, requirePermission('view_prescriptions'), ctrl.getPrescription);
router.put('/prescription/:id', protect, requirePermission('create_prescription'), ctrl.updatePrescription);
router.delete('/prescription/:id', protect, requirePermission('create_prescription'), ctrl.deletePrescription);
router.post('/prescription/:id/send', protect, requirePermission('create_prescription'), ctrl.sendPrescription);

// ─── EMR: Lab Requests ───────────────────────────────────────────────
router.get('/lab-requests', protect, requirePermission('view_lab_results'), ctrl.listLabRequests);
router.post('/lab-request', protect, requirePermission('request_lab'), ctrl.createLabRequest);
router.get('/lab-request/:id', protect, requirePermission('view_lab_results'), ctrl.getLabRequest);
router.put('/lab-request/:id', protect, requirePermission('request_lab'), ctrl.updateLabRequest);

// ─── EMR: Referrals ──────────────────────────────────────────────────
router.get('/referrals', protect, requirePermission('manage_referrals'), ctrl.listReferrals);
router.post('/referral', protect, requirePermission('manage_referrals'), ctrl.createReferral);
router.get('/referral/:id', protect, requirePermission('manage_referrals'), ctrl.getReferral);
router.patch('/referral/:id/status', protect, requirePermission('manage_referrals'), ctrl.updateReferralStatus);

// ─── EMR: Medical Records ────────────────────────────────────────────
router.get('/patient/:patientId/medical-records', protect, requirePermission('view_document'), ctrl.listMedicalRecords);
router.post('/medical-record', protect, requirePermission('upload_document'), ctrl.createMedicalRecord);

// ─── EMR: Messages ───────────────────────────────────────────────────
router.get('/messages', protect, ctrl.listMessages);
router.get('/messages/conversation/:otherUserId', protect, ctrl.getConversation);
router.post('/messages/send', protect, ctrl.sendMessage);
router.patch('/messages/:id/read', protect, ctrl.markMessageRead);
router.get('/messages/unread-count', protect, ctrl.unreadMessageCount);

// ─── EMR: Appointments ───────────────────────────────────────────────
router.get('/appointments', protect, requirePermission('manage_appointments'), ctrl.listAppointments);
router.post('/appointment', protect, requirePermission('manage_appointments'), ctrl.createAppointment);
router.patch('/appointment/:id/status', protect, requirePermission('manage_appointments'), ctrl.updateAppointmentStatus);

// ─── EMR: Notifications ──────────────────────────────────────────────
router.get('/notifications', protect, ctrl.listNotifications);
router.patch('/notifications/:id/read', protect, ctrl.markNotificationRead);
router.post('/notifications/mark-all-read', protect, ctrl.markAllNotificationsRead);
router.get('/notifications/unread-count', protect, ctrl.unreadNotificationCount);

// ─── Analytics ───────────────────────────────────────────────────────
router.get('/analytics/weekly-consultations', protect, requirePermission('view_ai_analytics'), ctrl.weeklyConsultations);
router.get('/analytics/monthly-consultations', protect, requirePermission('view_ai_analytics'), ctrl.monthlyConsultations);
router.get('/analytics/patient-demographics', protect, requirePermission('view_ai_analytics'), ctrl.patientDemographics);
router.get('/analytics/consultation-types', protect, requirePermission('view_ai_analytics'), ctrl.consultationTypes);
router.get('/analytics/common-diseases', protect, requirePermission('view_ai_analytics'), ctrl.commonDiseases);
router.get('/analytics/revenue', protect, requirePermission('view_ai_analytics'), ctrl.revenueAnalytics);

// ─── HIV Clinical Care ───────────────────────────────────────────────
router.get('/hiv/record/:patientId', protect, requirePermission('view_patient'), ctrl.getHIVRecord);
router.put('/hiv/record/:patientId', protect, requirePermission('manage_patients'), ctrl.updateHIVRecord);
router.post('/hiv/viral-load/:patientId', protect, requirePermission('manage_patients'), ctrl.addViralLoad);
router.post('/hiv/cd4/:patientId', protect, requirePermission('manage_patients'), ctrl.addCD4);
router.post('/hiv/regimen/:patientId', protect, requirePermission('manage_patients'), ctrl.addRegimen);
router.post('/hiv/oi/:patientId', protect, requirePermission('manage_patients'), ctrl.addOI);
router.post('/hiv/medication/:patientId', protect, requirePermission('manage_patients'), ctrl.addMedication);
router.post('/hiv/lab-result/:patientId', protect, requirePermission('manage_patients'), ctrl.addHIVLabResult);
router.post('/hiv/ai-analyze', protect, requirePermission('view_ai_analytics'), ctrl.hivAiAnalyze);

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
