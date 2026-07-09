const User = require('../../models/User');
const AIPatient = require('../../ai/models/AIPatient');
const StaffProfile = require('../../ai/models/StaffProfile');
const Department = require('../../ai/models/Department');
const PatientTimeline = require('../../ai/models/PatientTimeline');
const PharmacyDispense = require('../../ai/models/PharmacyDispense');
const LabResult = require('../../ai/models/LabResult');
const CounselingSession = require('../../ai/models/CounselingSession');
const CaseRecord = require('../../ai/models/CaseRecord');
const EMRLabRequest = require('../../ai/models/EMRLabRequest');
const EMRPrescription = require('../../ai/models/EMRPrescription');
const EMRReferral = require('../../ai/models/EMRReferral');
const AIChat = require('../../ai/models/AIChat');
const workflow = require('../services/workflow.service');
const { success, error } = require('../../utils/apiResponse');

// ─── Staff Management ──────────────────────────────────────────────
exports.registerStaff = async (req, res) => {
  const { fullName, email, password, phone, role, gender, hospitalId, department, specialization, staffId } = req.body;

  const clinicalRoles = ['doctor', 'nurse', 'pharmacist', 'lab_scientist', 'adherence_counselor', 'case_manager', 'receptionist', 'data_officer', 'hospital_admin'];
  if (!clinicalRoles.includes(role)) {
    return error(res, `Invalid clinical role: ${role}`, 400);
  }

  const existing = await User.findOne({ email });
  if (existing) return error(res, 'Email already registered', 409);

  const user = await User.create({
    fullName, email, password, phone,
    role,
    gender: gender || 'other',
    status: 'active',
    isEmailVerified: true,
  });

  // hospital_admin can only register staff for their own hospital
  const effectiveHospital = (req.user.role === 'hospital_admin' && req.staffProfile?.hospital)
    ? req.staffProfile.hospital
    : hospitalId;

  const profileData = {
    user: user._id,
    hospital: effectiveHospital,
    department,
    role,
    staffId: staffId || '',
    specialization: specialization || '',
    isAvailable: true,
    status: 'active',
    joinedAt: new Date(),
  };

  if (role === 'doctor' && req.body.medicalLicense) {
    profileData.medicalLicense = req.body.medicalLicense;
    profileData.consultationFee = req.body.consultationFee || 0;
    profileData.maxDailyPatients = req.body.maxDailyPatients || 20;
  }

  await StaffProfile.create(profileData);

  return success(res, {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  }, `Staff account created for ${fullName} (${role})`, 201);
};

exports.listStaff = async (req, res) => {
  const { role, hospital, department, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (hospital) filter.hospital = hospital;
  if (department) filter.department = department;
  if (status) filter['profile.status'] = status;

  const profiles = await StaffProfile.find(filter)
    .populate('user', 'fullName email phone role status profileImage')
    .populate('hospital', 'name')
    .sort({ createdAt: -1 });
  return success(res, profiles);
};

exports.updateStaff = async (req, res) => {
  const { id } = req.params;
  const allowed = ['specialization', 'department', 'isAvailable', 'status', 'maxDailyPatients', 'consultationFee', 'schedule', 'qualifications'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const profile = await StaffProfile.findOneAndUpdate(
    { user: id },
    { $set: updates },
    { new: true }
  );
  if (!profile) return error(res, 'Staff profile not found', 404);
  return success(res, profile, 'Staff profile updated');
};

// ─── Staff Profile ─────────────────────────────────────────────────
exports.getMyStaffProfile = async (req, res) => {
  if (!req.staffProfile) {
    return success(res, null, 'No staff profile found. Please contact your hospital administrator.');
  }
  return success(res, req.staffProfile);
};

exports.updateMyStaffProfile = async (req, res) => {
  const allowed = ['specialization', 'qualifications', 'schedule', 'consultationFee', 'maxDailyPatients', 'services', 'languages'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const profile = await StaffProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return success(res, profile, 'Profile updated');
};

// ─── Triage & Vitals ───────────────────────────────────────────────
exports.getTriageQueue = async (req, res) => {
  const { status, hospital } = req.query;
  const filter = {};
  if (status) filter['triage.status'] = status;
  if (hospital) filter.hospital = hospital;
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;

  const patients = await AIPatient.find(filter)
    .populate('hospital', 'name state lga')
    .sort({ updatedAt: -1 })
    .limit(50);
  return success(res, patients);
};

exports.recordTriage = async (req, res) => {
  const { patientId } = req.params;
  const { triageCategory, triageNotes, chiefComplaint, painLevel } = req.body;

  const patient = await AIPatient.findByIdAndUpdate(patientId, {
    $set: {
      'triage.category': triageCategory,
      'triage.notes': triageNotes,
      'triage.performedBy': req.user._id,
      'triage.performedAt': new Date(),
      'triage.status': 'completed',
      chiefComplaint,
      painLevel,
    },
  }, { new: true });

  if (!patient) return error(res, 'Patient not found', 404);

  await PatientTimeline.create({
    patient: patientId,
    activityType: 'triage_completed',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { triageCategory, chiefComplaint },
  });

  if (triageCategory === 'emergency' || triageCategory === 'urgent') {
    const notifService = require('../services/notification.service');
    await notifService.notify({
      hospital: req.staffProfile?.hospital,
      role: 'doctor',
      type: 'patient_escalated',
      title: `Urgent triage: ${patient?.name || 'Patient'}`,
      message: `Triaged as ${triageCategory.replace('_', ' ')} — ${chiefComplaint}`,
      patient: patientId,
      patientName: patient?.name,
      link: `/dashboard/clinical/triage`,
      priority: triageCategory === 'emergency' ? 'critical' : 'high',
    });
  }

  return success(res, patient, 'Triage recorded');
};

exports.recordVitals = async (req, res) => {
  const { patientId } = req.params;
  const { weight, height, temperature, bloodPressureSystolic, bloodPressureDiastolic, pulse, respiration, oxygenSaturation, notes } = req.body;

  const vitals = { weight, height, temperature, bloodPressureSystolic, bloodPressureDiastolic, pulse, respiration, oxygenSaturation, notes, recordedBy: req.user._id, recordedAt: new Date() };

  const patient = await AIPatient.findByIdAndUpdate(patientId, {
    $set: { vitals },
    $push: { vitalsHistory: vitals },
  }, { new: true });

  if (!patient) return error(res, 'Patient not found', 404);

  await PatientTimeline.create({
    patient: patientId,
    activityType: 'vitals_recorded',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { bloodPressureSystolic, bloodPressureDiastolic, pulse, temperature },
  });

  return success(res, patient, 'Vitals recorded');
};

exports.getPatientVitals = async (req, res) => {
  const patient = await AIPatient.findById(req.params.patientId).select('vitals vitalsHistory name phone');
  if (!patient) return error(res, 'Patient not found', 404);
  return success(res, patient);
};

exports.escalateToDoctor = async (req, res) => {
  const { patientId, reason, notes } = req.body;
  const patient = await AIPatient.findById(patientId);
  if (!patient) return error(res, 'Patient not found', 404);

  await PatientTimeline.create({
    patient: patientId,
    activityType: 'consultation_requested',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { escalationReason: reason, notes },
  });

  const notifService = require('../services/notification.service');
  await notifService.notify({
    hospital: req.staffProfile?.hospital,
    role: 'doctor',
    type: 'patient_escalated',
    title: `Patient escalated: ${patient?.name || 'Unknown'}`,
    message: reason || 'Escalated from triage for further evaluation',
    patient: patientId,
    patientName: patient?.name,
    link: `/dashboard/clinical/triage`,
    priority: 'high',
  });

  return success(res, { patientId, escalated: true }, 'Patient escalated to doctor');
};

// ─── Pharmacy ───────────────────────────────────────────────────────
exports.getPendingPrescriptions = async (req, res) => {
  const filter = { status: 'active' };
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;
  const prescriptions = await EMRPrescription.find(filter)
    .populate('patient', 'name phone')
    .populate('doctor', 'name')
    .sort({ createdAt: -1 });
  return success(res, prescriptions);
};

exports.getPrescriptionDetail = async (req, res) => {
  const prescription = await EMRPrescription.findById(req.params.id)
    .populate('patient', 'name phone age gender')
    .populate('doctor', 'name');
  if (!prescription) return error(res, 'Prescription not found', 404);
  return success(res, prescription);
};

exports.reviewPrescription = async (req, res) => {
  const { prescriptionId } = req.params;
  const { status, notes } = req.body;

  const prescription = await EMRPrescription.findById(prescriptionId);
  if (!prescription) return error(res, 'Prescription not found', 404);

  if (status === 'cancelled') {
    prescription.status = 'cancelled';
    await prescription.save();
    await PatientTimeline.create({
      patient: prescription.patient,
      activityType: 'prescription_cancelled',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      metadata: { prescriptionId, notes },
    });
    return success(res, prescription, 'Prescription cancelled');
  }

  prescription.status = 'active';
  await prescription.save();
  await PatientTimeline.create({
    patient: prescription.patient,
    activityType: 'prescription_reviewed',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    metadata: { prescriptionId, notes },
  });

  return success(res, prescription, 'Prescription reviewed');
};

exports.dispensePrescription = async (req, res) => {
  const { prescriptionId } = req.params;
  const { items, counselingNotes } = req.body;

  const prescription = await EMRPrescription.findById(prescriptionId);
  if (!prescription) return error(res, 'Prescription not found', 404);

  const dispense = await PharmacyDispense.create({
    prescription: prescriptionId,
    patient: prescription.patient,
    doctor: prescription.doctor,
    dispensedBy: req.user._id,
    hospital: req.staffProfile?.hospital || prescription.hospital,
    items: items || [],
    status: 'dispensed',
    counselingProvided: !!counselingNotes,
    counselingNotes,
    dispensedAt: new Date(),
  });

  prescription.status = 'completed';
  await prescription.save();

  await PatientTimeline.create({
    patient: prescription.patient,
    activityType: 'prescription_dispensed',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { prescriptionId, dispenseId: dispense._id, itemCount: items?.length },
  });

  const notifService = require('../services/notification.service');
  await notifService.notify({
    hospital: req.staffProfile?.hospital,
    type: 'prescription_dispensed',
    title: 'Prescription dispensed',
    message: `${prescription.patient?.name || 'Patient'} — ${items?.length || 0} items dispensed`,
    patient: prescription.patient,
    patientName: prescription.patient?.name,
    link: `/dashboard/clinical/pharmacy`,
    priority: 'normal',
  });

  return success(res, dispense, 'Prescription dispensed');
};

exports.getPharmacyHistory = async (req, res) => {
  const records = await PharmacyDispense.find({ patient: req.params.patientId })
    .populate('dispensedBy', 'name')
    .populate('prescription')
    .sort({ createdAt: -1 });
  return success(res, records);
};

// ─── Laboratory ─────────────────────────────────────────────────────
exports.getLabRequests = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  else filter.status = { $in: ['requested', 'sample_collected', 'processing'] };
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;

  const requests = await EMRLabRequest.find(filter)
    .populate('patient', 'name phone')
    .populate('doctor', 'name')
    .sort({ createdAt: -1 });
  return success(res, requests);
};

exports.collectSample = async (req, res) => {
  const { requestId } = req.params;
  const { sampleType, notes } = req.body;

  const labRequest = await EMRLabRequest.findByIdAndUpdate(requestId, {
    $set: { status: 'sample_collected', sampleType, notes },
  }, { new: true });
  if (!labRequest) return error(res, 'Lab request not found', 404);

  await PatientTimeline.create({
    patient: labRequest.patient,
    activityType: 'sample_collected',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    metadata: { requestId, sampleType },
  });

  return success(res, labRequest, 'Sample collection recorded');
};

exports.uploadLabResult = async (req, res) => {
  const { requestId } = req.params;
  const { tests, notes } = req.body;

  const labRequest = await EMRLabRequest.findByIdAndUpdate(requestId, {
    $set: { status: 'completed', notes, resultDate: new Date() },
  }, { new: true });
  if (!labRequest) return error(res, 'Lab request not found', 404);

  const criticalFlags = tests?.filter(t => t.isCritical).map(t => t.testName) || [];

  const labResult = await LabResult.create({
    labRequest: requestId,
    patient: labRequest.patient,
    doctor: labRequest.doctor,
    processedBy: req.user._id,
    hospital: req.staffProfile?.hospital,
    tests: tests || [],
    status: 'completed',
    resultDate: new Date(),
    hasCriticalResults: criticalFlags.length > 0,
    criticalFlags,
    notes,
  });

  await PatientTimeline.create({
    patient: labRequest.patient,
    activityType: criticalFlags.length > 0 ? 'lab_critical_flagged' : 'lab_result_uploaded',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { requestId, testCount: tests?.length, criticalFlags },
  });

  const notifService = require('../services/notification.service');
  if (criticalFlags.length > 0) {
    await notifService.notify({
      hospital: req.staffProfile?.hospital,
      role: 'doctor',
      type: 'lab_critical_flagged',
      title: `CRITICAL Lab Result`,
      message: `${labRequest.patient?.name || 'Patient'} — Critical: ${criticalFlags.join(', ')}`,
      patient: labRequest.patient,
      patientName: labRequest.patient?.name,
      link: `/dashboard/clinical/laboratory`,
      priority: 'critical',
    });
  }

  return success(res, labResult, 'Lab results uploaded');
};

exports.getCriticalResults = async (req, res) => {
  const results = await LabResult.find({ hasCriticalResults: true, status: 'completed' })
    .populate('patient', 'name phone')
    .populate('processedBy', 'name')
    .sort({ createdAt: -1 });
  return success(res, results);
};

exports.getPatientLabResults = async (req, res) => {
  const results = await LabResult.find({ patient: req.params.patientId })
    .populate('processedBy', 'name')
    .sort({ createdAt: -1 });
  return success(res, results);
};

// ─── Adherence & Counseling ─────────────────────────────────────────
exports.getPoorAdherencePatients = async (req, res) => {
  const HIVRecord = require('../../ai/models/AIHIVRecord');
  const records = await HIVRecord.find({
    $or: [
      { medicationAdherence: { $lt: 80 } },
      { adherenceScore: { $lt: 80 } },
      { missedRefills: { $gt: 1 } },
      { missedAppointments: { $gt: 1 } },
      { latestViralLoadStatus: 'unsuppressed' },
    ],
  }).populate('patient', 'name phone age gender artNumber').sort({ adherenceScore: 1 }).limit(50);
  return success(res, records);
};

exports.createCounselingSession = async (req, res) => {
  const session = await CounselingSession.create({
    ...req.body,
    counselor: req.user._id,
    hospital: req.staffProfile?.hospital,
  });

  await PatientTimeline.create({
    patient: req.body.patient,
    activityType: 'counseling_session',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { sessionId: session._id, type: req.body.type },
  });

  const notifService = require('../services/notification.service');
  await notifService.notify({
    hospital: req.staffProfile?.hospital,
    type: 'counseling_session_scheduled',
    title: 'Counseling session completed',
    message: `${session.patientName || 'Patient'} — ${req.body.type?.replace('_', ' ') || 'Adherence'} counseling`,
    patient: req.body.patient,
    link: `/dashboard/clinical/adherence`,
  });

  return success(res, session, 'Counseling session recorded');
};

exports.getPatientCounselingSessions = async (req, res) => {
  const sessions = await CounselingSession.find({ patient: req.params.patientId })
    .populate('counselor', 'name')
    .sort({ createdAt: -1 });
  return success(res, sessions);
};

exports.updateCounselingSession = async (req, res) => {
  const session = await CounselingSession.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!session) return error(res, 'Session not found', 404);
  return success(res, session, 'Session updated');
};

// ─── Case Management ────────────────────────────────────────────────
exports.getHighRiskPatients = async (req, res) => {
  const cases = await CaseRecord.find({ riskLevel: { $in: ['high', 'critical'] }, status: { $ne: 'closed' } })
    .populate('patient', 'name phone age gender artNumber')
    .populate('caseManager', 'name')
    .sort({ riskLevel: 1, nextFollowUpDate: 1 });
  return success(res, cases);
};

exports.openCaseRecord = async (req, res) => {
  const existing = await CaseRecord.findOne({ patient: req.body.patient });
  if (existing) return error(res, 'A case record already exists for this patient', 409);

  const record = await CaseRecord.create({
    ...req.body,
    caseManager: req.user._id,
    hospital: req.staffProfile?.hospital,
    openedAt: new Date(),
  });

  await PatientTimeline.create({
    patient: req.body.patient,
    activityType: 'case_opened',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { caseId: record._id, category: req.body.category, riskLevel: req.body.riskLevel },
  });

  const notifService = require('../services/notification.service');
  await notifService.notify({
    hospital: req.staffProfile?.hospital,
    type: 'case_assigned',
    title: `Case opened — ${record.riskLevel || 'high'} risk`,
    message: `New case record opened for ${record.patientName || 'patient'}`,
    patient: req.body.patient,
    link: `/dashboard/clinical/case`,
    priority: record.riskLevel === 'critical' ? 'critical' : 'high',
  });

  return success(res, record, 'Case record opened');
};

exports.getMyCases = async (req, res) => {
  const filter = { caseManager: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const cases = await CaseRecord.find(filter)
    .populate('patient', 'name phone age gender artNumber')
    .sort({ riskLevel: -1, nextFollowUpDate: 1 });
  return success(res, cases);
};

exports.getPatientCaseRecord = async (req, res) => {
  const record = await CaseRecord.findOne({ patient: req.params.patientId })
    .populate('caseManager', 'name')
    .populate('interventions.conductedBy', 'name');
  if (!record) return error(res, 'No case record found for this patient', 404);
  return success(res, record);
};

exports.updateCaseRecord = async (req, res) => {
  const record = await CaseRecord.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!record) return error(res, 'Case record not found', 404);
  return success(res, record, 'Case record updated');
};

exports.addIntervention = async (req, res) => {
  const record = await CaseRecord.findById(req.params.id);
  if (!record) return error(res, 'Case record not found', 404);

  record.interventions.push({ ...req.body, conductedBy: req.user._id, date: new Date() });
  record.lastContactDate = new Date();
  if (req.body.followUpDate) record.nextFollowUpDate = req.body.followUpDate;
  await record.save();

  await PatientTimeline.create({
    patient: record.patient,
    activityType: req.body.type === 'home_visit' ? 'home_visit' : 'outreach_conducted',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { caseId: record._id, interventionType: req.body.type },
  });

  return success(res, record, 'Intervention added');
};

exports.createReferral = async (req, res) => {
  const referral = await EMRReferral.create({
    ...req.body,
    fromDoctor: req.user._id,
  });

  await PatientTimeline.create({
    patient: req.body.patient,
    activityType: 'referral_sent',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    metadata: { referralId: referral._id, toHospital: req.body.toHospital },
  });

  return success(res, referral, 'Referral created');
};

exports.getMyReferrals = async (req, res) => {
  const referrals = await EMRReferral.find({ fromDoctor: req.user._id })
    .populate('patient', 'name phone')
    .populate('toHospital', 'name')
    .sort({ createdAt: -1 });
  return success(res, referrals);
};

// ─── Patient Timeline ───────────────────────────────────────────────
exports.getPatientTimeline = async (req, res) => {
  const entries = await PatientTimeline.find({ patient: req.params.patientId })
    .populate('performedBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(100);
  return success(res, entries);
};

// ─── Patient Search ─────────────────────────────────────────────────
exports.searchPatients = async (req, res) => {
  const { q } = req.query;
  let filter = {};
  if (q) {
    const regex = new RegExp(q, 'i');
    filter = {
      $or: [
        { name: regex },
        { phone: regex },
        { artNumber: regex },
        { fileNumber: regex },
      ],
    };
  }
  const patients = await AIPatient.find(filter)
    .populate('hospital', 'name')
    .sort({ updatedAt: -1 })
    .limit(20);
  return success(res, patients);
};

exports.getPatientDetail = async (req, res) => {
  const patient = await AIPatient.findById(req.params.id)
    .populate('hospital', 'name state lga')
    .populate('preferredDoctor', 'name')
    .populate('preferredHospital', 'name');
  if (!patient) return error(res, 'Patient not found', 404);
  return success(res, patient);
};

// ─── Reminders ───────────────────────────────────────────────────────
exports.createReminder = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const reminder = await AIReminder.create({
    ...req.body,
    createdBy: req.user._id,
    hospital: req.staffProfile?.hospital,
    nextScheduledAt: req.body.scheduledTime,
  });

  await PatientTimeline.create({
    patient: req.body.patient,
    activityType: 'note_added',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    description: `Reminder created: ${reminder.title}`,
    metadata: { reminderId: reminder._id, reminderType: reminder.reminderType },
  });

  return success(res, reminder, 'Reminder created', 201);
};

exports.listReminders = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const { patient, status, reminderType, from, to } = req.query;
  const filter = {};
  if (patient) filter.patient = patient;
  if (status) filter.status = status;
  if (reminderType) filter.reminderType = reminderType;
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;
  if (from || to) {
    filter.scheduledTime = {};
    if (from) filter.scheduledTime.$gte = new Date(from);
    if (to) filter.scheduledTime.$lte = new Date(to);
  }

  const reminders = await AIReminder.find(filter)
    .populate('patient', 'name phone')
    .sort({ scheduledTime: -1 })
    .limit(100);
  return success(res, reminders);
};

exports.getReminder = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const reminder = await AIReminder.findById(req.params.id)
    .populate('patient', 'name phone age gender');
  if (!reminder) return error(res, 'Reminder not found', 404);
  return success(res, reminder);
};

exports.updateReminder = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const allowed = ['title', 'description', 'scheduledTime', 'recurrence', 'channels', 'status', 'reminderType'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const reminder = await AIReminder.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!reminder) return error(res, 'Reminder not found', 404);
  return success(res, reminder, 'Reminder updated');
};

exports.deleteReminder = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const reminder = await AIReminder.findByIdAndDelete(req.params.id);
  if (!reminder) return error(res, 'Reminder not found', 404);
  return success(res, null, 'Reminder deleted');
};

exports.reminderAction = async (req, res) => {
  const AdherenceService = require('../../ai/services/AdherenceService');
  const { action, note } = req.body;
  const validActions = ['taken', 'snoozed', 'skipped', 'need_help'];
  if (!validActions.includes(action)) return error(res, `Invalid action. Must be one of: ${validActions.join(', ')}`, 400);

  const result = await AdherenceService.processAction(req.params.id, action, {
    note,
    source: 'web',
    userId: req.user._id,
  });

  return success(res, result, `Reminder ${action}`);
};

exports.getMyReminders = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const AIPatient = require('../../ai/models/AIPatient');

  // Get patients associated with this user's hospital
  const filter = { status: { $in: ['pending', 'sent', 'snoozed'] } };
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;

  const reminders = await AIReminder.find(filter)
    .populate('patient', 'name phone')
    .sort({ scheduledTime: 1 })
    .limit(50);
  return success(res, reminders);
};

// ─── Adherence Analytics ─────────────────────────────────────────────
exports.getAdherenceAnalytics = async (req, res) => {
  const AdherenceService = require('../../ai/services/AdherenceService');
  const { days } = req.query;
  const analytics = await AdherenceService.getPatientAnalytics(req.params.patientId, parseInt(days) || 30);
  return success(res, analytics);
};

exports.getMyAdherenceOverview = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const PatientTimeline = require('../../ai/models/PatientTimeline');

  const filter = {};
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;

  const totalReminders = await AIReminder.countDocuments({ ...filter, status: { $in: ['pending', 'sent', 'completed', 'skipped'] } });
  const completed = await AIReminder.countDocuments({ ...filter, status: 'completed' });
  const pending = await AIReminder.countDocuments({ ...filter, status: { $in: ['pending', 'sent'] } });
  const missed = await AIReminder.countDocuments({ ...filter, status: 'skipped' });

  return success(res, {
    totalReminders,
    completed,
    pending,
    missed,
    adherenceRate: totalReminders > 0 ? Math.round((completed / totalReminders) * 100) : 100,
    activePatients: await AIReminder.distinct('patient', filter).then(r => r.length),
  });
};

// ─── VOA Profile ─────────────────────────────────────────────────────
exports.getMyVOAProfile = async (req, res) => {
  const VOAProfile = require('../../ai/models/VOAProfile');
  const profile = await VOAProfile.findOne({ user: req.user._id }).populate('organization', 'name');
  if (!profile) return success(res, null, 'No VOA profile found');
  return success(res, profile);
};

exports.updateMyVOAProfile = async (req, res) => {
  const VOAProfile = require('../../ai/models/VOAProfile');
  const allowed = ['membershipType', 'phone', 'address', 'dateOfBirth', 'gender', 'occupation', 'bio', 'photoUrl', 'chapter', 'caregiverOptIn', 'caregiverContact', 'dataSharingConsent'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const profile = await VOAProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return success(res, profile, 'VOA profile updated');
};

exports.getVOAProfile = async (req, res) => {
  const VOAProfile = require('../../ai/models/VOAProfile');
  const profile = await VOAProfile.findById(req.params.id).populate('user', 'fullName email phone');
  if (!profile) return error(res, 'Profile not found', 404);
  return success(res, profile);
};

exports.listVOAProfiles = async (req, res) => {
  const VOAProfile = require('../../ai/models/VOAProfile');
  const { membershipStatus, membershipType, chapter } = req.query;
  const filter = {};
  if (membershipStatus) filter.membershipStatus = membershipStatus;
  if (membershipType) filter.membershipType = membershipType;
  if (chapter) filter.chapter = chapter;

  const profiles = await VOAProfile.find(filter)
    .populate('user', 'fullName email phone role')
    .populate('organization', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
  return success(res, profiles);
};

// ─── Escalation Management ───────────────────────────────────────────
exports.getEscalations = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const { resolved } = req.query;

  const filter = { 'escalationHistory.0': { $exists: true } };
  if (resolved === 'true') filter['escalationHistory.resolved'] = true;
  else if (resolved === 'false') filter['escalationHistory.resolved'] = false;
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;

  const reminders = await AIReminder.find(filter)
    .populate('patient', 'name phone')
    .sort({ updatedAt: -1 })
    .limit(50);

  return success(res, reminders);
};

exports.resolveEscalation = async (req, res) => {
  const AIReminder = require('../../ai/models/AIReminder');
  const { reminderId, escalationIndex } = req.params;
  const { notes } = req.body;

  const reminder = await AIReminder.findById(reminderId);
  if (!reminder) return error(res, 'Reminder not found', 404);

  const escalation = reminder.escalationHistory[parseInt(escalationIndex)];
  if (!escalation) return error(res, 'Escalation not found', 404);

  escalation.resolved = true;
  escalation.resolvedAt = new Date();
  escalation.resolvedBy = req.user._id;
  if (notes) escalation.reason = notes;

  await reminder.save();

  await PatientTimeline.create({
    patient: reminder.patient,
    activityType: 'note_added',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    description: `Escalation resolved for reminder: ${reminder.title}`,
    metadata: { reminderId, escalationLevel: reminder.escalationLevel },
  });

  return success(res, reminder, 'Escalation resolved');
};

// ─── Appointments ────────────────────────────────────────────────────
const EMRAppointment = require('../../ai/models/EMRAppointment');

exports.listAppointments = async (req, res) => {
  const { date, status, doctor } = req.query;
  const filter = {};
  if (date) filter.date = date;
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
  if (req.staffProfile?.hospital) filter.hospital = req.staffProfile.hospital;

  const appointments = await EMRAppointment.find(filter)
    .populate('patient', 'name phone')
    .populate('doctor', 'name')
    .sort({ date: 1, time: 1 });
  return success(res, appointments);
};

exports.getAppointment = async (req, res) => {
  const appointment = await EMRAppointment.findById(req.params.id)
    .populate('patient', 'name phone age gender')
    .populate('doctor', 'name specialization');
  if (!appointment) return error(res, 'Appointment not found', 404);
  return success(res, appointment);
};

exports.createAppointment = async (req, res) => {
  const appointment = await EMRAppointment.create({
    ...req.body,
    hospital: req.staffProfile?.hospital || req.body.hospital,
  });

  await PatientTimeline.create({
    patient: req.body.patient,
    activityType: 'appointment_scheduled',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { appointmentId: appointment._id, date: req.body.date, time: req.body.time },
  });

  return success(res, appointment, 'Appointment scheduled', 201);
};

exports.updateAppointmentStatus = async (req, res) => {
  const { status, notes } = req.body;
  const appointment = await EMRAppointment.findByIdAndUpdate(
    req.params.id,
    { $set: { status, notes } },
    { new: true }
  );
  if (!appointment) return error(res, 'Appointment not found', 404);

  const timelineType = {
    checked_in: 'appointment_checked_in',
    in_progress: 'appointment_started',
    completed: 'appointment_completed',
    cancelled: 'appointment_cancelled',
  }[status] || 'appointment_updated';

  await PatientTimeline.create({
    patient: appointment.patient,
    activityType: timelineType,
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { appointmentId: appointment._id, status, notes },
  });

  return success(res, appointment, `Appointment ${status}`);
};

// ─── Notifications ────────────────────────────────────────────────────
const Notification = require('../../ai/models/Notification');
const notifyService = require('../services/notification.service');

exports.getMyNotifications = async (req, res) => {
  const { unreadOnly, limit } = req.query;
  const notifications = await notifyService.getNotifications(req.user._id, {
    unreadOnly: unreadOnly === 'true',
    limit: parseInt(limit) || 50,
  });
  return success(res, notifications);
};

exports.getUnreadNotificationCount = async (req, res) => {
  const count = await notifyService.getUnreadCount(req.user._id);
  return success(res, { count });
};

exports.markNotificationRead = async (req, res) => {
  const notification = await notifyService.markRead(req.params.id, req.user._id);
  if (!notification) return error(res, 'Notification not found', 404);
  return success(res, notification, 'Marked as read');
};

exports.markAllNotificationsRead = async (req, res) => {
  await notifyService.markAllRead(req.user._id);
  return success(res, null, 'All notifications marked as read');
};

// ─── Workflow: PatientVisit ───────────────────────────────────────────

exports.getWorkflowQueue = async (req, res, next) => {
  try {
    const hospitalId = req.staffProfile?.hospital || req.query.hospital;
    const statuses = req.query.statuses?.split(',') || ['checked_in', 'triaged'];
    const visits = await workflow.getWaitingQueue(hospitalId, statuses);
    return success(res, visits);
  } catch (err) { next(err); }
};

exports.getWorkflowDoctorQueue = async (req, res, next) => {
  try {
    const visits = await workflow.getDoctorQueue(req.user._id);
    return success(res, visits);
  } catch (err) { next(err); }
};

exports.getActiveWorkflowVisits = async (req, res, next) => {
  try {
    const hospitalId = req.staffProfile?.hospital || req.query.hospital;
    const visits = await workflow.getActiveVisits(hospitalId, req.query.status);
    return success(res, visits);
  } catch (err) { next(err); }
};

exports.getWorkflowVisitById = async (req, res, next) => {
  try {
    const visit = await workflow.getVisitById(req.params.id);
    if (!visit) return error(res, 'Visit not found', 404);
    return success(res, visit);
  } catch (err) { next(err); }
};

exports.checkInPatient = async (req, res, next) => {
  try {
    const visit = await workflow.createVisit({
      patient:   req.body.patient,
      hospital:  req.body.hospital,
      department: req.body.department,
      visitType: req.body.visitType,
      source:    req.body.source,
    }, req);
    return success(res, visit, 'Patient checked in');
  } catch (err) { next(err); }
};

exports.transitionWorkflowVisit = async (req, res, next) => {
  try {
    const visit = await workflow.transitionVisit(req.params.visitId, req.body.status, req, {
      notes: req.body.notes,
    });
    return success(res, visit, `Visit status updated to "${req.body.status}"`);
  } catch (err) { next(err); }
};

exports.dischargePatient = async (req, res, next) => {
  try {
    const visit = await workflow.transitionVisit(req.params.visitId, 'discharged', req, {
      notes:        req.body.dischargeNotes,
      followUpDate: req.body.followUpDate,
    });
    return success(res, visit, 'Patient discharged');
  } catch (err) { next(err); }
};

exports.startVisitConsultation = async (req, res, next) => {
  try {
    const visit = await workflow.getVisitById(req.params.visitId);
    if (!visit) return error(res, 'Visit not found', 404);
    if (visit.status !== 'triaged') return error(res, 'Visit must be triaged before starting consultation', 400);

    const AIConsultation = require('../../ai/models/AIConsultation');
    const consultation = await AIConsultation.create({
      patient: visit.patient?._id || visit.patient,
      hospital: visit.hospital,
      type: visit.visitType,
      status: 'in_progress',
      doctor: null,
      startedAt: new Date(),
    });

    visit.consultation = consultation._id;
    visit.status = 'in_consultation';
    visit.attendedBy = req.user._id;
    visit.consultationStartTime = new Date();
    await visit.save();

    await PatientTimeline.create({
      patient: visit.patient?._id || visit.patient,
      activityType: 'consultation_started',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      performedByName: req.user.fullName,
      metadata: { visitId: visit._id.toString(), consultationId: consultation._id.toString() },
    });

    return success(res, { visit, consultation }, 'Consultation started');
  } catch (err) { next(err); }
};
