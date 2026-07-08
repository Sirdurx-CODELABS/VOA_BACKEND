const router = require('express').Router();
const { protect, requirePermission, requireClinicalRole, loadStaffProfile } = require('../../middleware/auth');
const ctrl = require('../controllers/clinical.controller');

// All clinical routes require authentication + clinical role
router.use(protect, requireClinicalRole(), loadStaffProfile);

// ─── Staff Management (admin only) ─────────────────────────────────
router.post('/staff/register', protect, requirePermission('manage_staff'), ctrl.registerStaff);
router.get('/staff', protect, requirePermission('manage_staff'), ctrl.listStaff);
router.put('/staff/:id', protect, requirePermission('manage_staff'), ctrl.updateStaff);

// ─── Staff Profile ─────────────────────────────────────────────────
router.get('/me/profile', ctrl.getMyStaffProfile);
router.put('/me/profile', requirePermission('edit_own_profile'), ctrl.updateMyStaffProfile);

// ─── Triage & Vitals ───────────────────────────────────────────────
router.get('/triage/queue',           requirePermission('triage_patient'),        ctrl.getTriageQueue);
router.post('/triage/:patientId',     requirePermission('triage_patient'),        ctrl.recordTriage);
router.post('/vitals/:patientId',     requirePermission('record_vitals'),         ctrl.recordVitals);
router.get('/vitals/:patientId',      requirePermission('view_vitals'),           ctrl.getPatientVitals);
router.post('/triage/escalate',       requirePermission('triage_patient'),        ctrl.escalateToDoctor);

// ─── Pharmacy ──────────────────────────────────────────────────────
router.get('/pharmacy/prescriptions', requirePermission('view_prescriptions'),    ctrl.getPendingPrescriptions);
router.get('/pharmacy/prescriptions/:id', requirePermission('view_prescriptions'), ctrl.getPrescriptionDetail);
router.post('/pharmacy/review/:prescriptionId', requirePermission('review_prescription'), ctrl.reviewPrescription);
router.post('/pharmacy/dispense/:prescriptionId', requirePermission('dispense_medication'), ctrl.dispensePrescription);
router.get('/pharmacy/history/:patientId', requirePermission('view_prescriptions'), ctrl.getPharmacyHistory);

// ─── Laboratory ────────────────────────────────────────────────────
router.get('/lab/requests',           requirePermission('process_sample'),        ctrl.getLabRequests);
router.put('/lab/collect/:requestId', requirePermission('process_sample'),        ctrl.collectSample);
router.put('/lab/result/:requestId',  requirePermission('upload_lab_results'),    ctrl.uploadLabResult);
router.get('/lab/critical',           requirePermission('flag_critical_result'),  ctrl.getCriticalResults);
router.get('/lab/results/:patientId', requirePermission('view_lab_results'),      ctrl.getPatientLabResults);

// ─── Adherence & Counseling ────────────────────────────────────────
router.get('/adherence/patients',     requirePermission('view_adherence'),        ctrl.getPoorAdherencePatients);
router.post('/adherence/session',     requirePermission('conduct_counseling'),    ctrl.createCounselingSession);
router.get('/adherence/sessions/:patientId', requirePermission('view_adherence'), ctrl.getPatientCounselingSessions);
router.put('/adherence/session/:id',  requirePermission('conduct_counseling'),    ctrl.updateCounselingSession);

// ─── Case Management ───────────────────────────────────────────────
router.get('/case/high-risk',         requirePermission('manage_case'),           ctrl.getHighRiskPatients);
router.post('/case/open',             requirePermission('manage_case'),           ctrl.openCaseRecord);
router.get('/case/mine',              requirePermission('manage_case'),           ctrl.getMyCases);
router.get('/case/:patientId',        requirePermission('manage_case'),           ctrl.getPatientCaseRecord);
router.put('/case/:id',               requirePermission('manage_case'),           ctrl.updateCaseRecord);
router.post('/case/:id/intervention', requirePermission('manage_case'),           ctrl.addIntervention);
router.post('/case/referral',         requirePermission('manage_referrals'),      ctrl.createReferral);
router.get('/case/referrals/mine',    requirePermission('manage_referrals'),      ctrl.getMyReferrals);

// ─── Patient Timeline ──────────────────────────────────────────────
router.get('/timeline/:patientId',    requirePermission('view_patient_timeline'), ctrl.getPatientTimeline);

// ─── Reminders ───────────────────────────────────────────────────────
router.get('/reminders',              requirePermission('manage_adherence'),      ctrl.listReminders);
router.get('/reminders/my',           requirePermission('manage_adherence'),      ctrl.getMyReminders);
router.post('/reminders',             requirePermission('manage_adherence'),      ctrl.createReminder);
router.get('/reminders/:id',          requirePermission('manage_adherence'),      ctrl.getReminder);
router.put('/reminders/:id',          requirePermission('manage_adherence'),      ctrl.updateReminder);
router.delete('/reminders/:id',       requirePermission('manage_adherence'),      ctrl.deleteReminder);
router.post('/reminders/:id/action',  requirePermission('manage_adherence'),      ctrl.reminderAction);

// ─── Adherence Analytics ─────────────────────────────────────────────
router.get('/adherence/analytics/:patientId', requirePermission('view_adherence'), ctrl.getAdherenceAnalytics);
router.get('/adherence/overview',     requirePermission('view_adherence'),        ctrl.getMyAdherenceOverview);

// ─── Escalation Management ───────────────────────────────────────────
router.get('/escalations',            requirePermission('manage_adherence'),      ctrl.getEscalations);
router.post('/escalations/:reminderId/resolve/:escalationIndex', requirePermission('manage_adherence'), ctrl.resolveEscalation);

// ─── VOA Profile ────────────────────────────────────────────────────
router.get('/voa-profile/me',         ctrl.getMyVOAProfile);
router.put('/voa-profile/me',         requirePermission('edit_own_profile'),     ctrl.updateMyVOAProfile);
router.get('/voa-profile/:id',        requirePermission('view_patient'),         ctrl.getVOAProfile);
router.get('/voa-profiles',           requirePermission('view_patient'),         ctrl.listVOAProfiles);

// ─── Patient Search (unified) ──────────────────────────────────────
router.get('/patients/search',        requirePermission('view_patient'),          ctrl.searchPatients);
router.get('/patients/:id',           requirePermission('view_patient'),          ctrl.getPatientDetail);

// ─── Notifications ────────────────────────────────────────────────────
router.get('/notifications',          ctrl.getMyNotifications);
router.get('/notifications/unread-count', ctrl.getUnreadNotificationCount);
router.put('/notifications/:id/read', ctrl.markNotificationRead);
router.put('/notifications/read-all', ctrl.markAllNotificationsRead);

module.exports = router;
