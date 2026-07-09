const PatientVisit       = require('../../ai/models/PatientVisit');
const PatientTimeline    = require('../../ai/models/PatientTimeline');
const EMRPrescription    = require('../../ai/models/EMRPrescription');
const EMRLabRequest      = require('../../ai/models/EMRLabRequest');
const EMRReferral        = require('../../ai/models/EMRReferral');
const LabResult          = require('../../ai/models/LabResult');
const PharmacyDispense   = require('../../ai/models/PharmacyDispense');
const AIConsultation     = require('../../ai/models/AIConsultation');
const notificationService = require('./notification.service');

const VALID_TRANSITIONS = {
  checked_in:      ['triaged', 'cancelled'],
  triaged:         ['in_consultation', 'cancelled'],
  in_consultation: ['lab_ordered', 'in_pharmacy', 'discharged', 'cancelled'],
  lab_ordered:     ['in_consultation', 'in_pharmacy', 'discharged', 'cancelled'],
  in_pharmacy:     ['dispensed', 'discharged', 'cancelled'],
  dispensed:       ['discharged', 'in_pharmacy', 'cancelled'],
  discharged:      [],
  cancelled:       [],
};

const TRANSITION_LABELS = {
  checked_in:      'Checked in',
  triaged:         'Triaged',
  in_consultation: 'In consultation',
  lab_ordered:     'Lab ordered',
  in_pharmacy:     'In pharmacy',
  dispensed:       'Medication dispensed',
  discharged:      'Discharged',
  cancelled:       'Cancelled',
};

async function transitionVisit(visitId, newStatus, req, extra = {}) {
  const visit = await PatientVisit.findById(visitId).populate('patient');
  if (!visit) throw Object.assign(new Error('Visit not found'), { statusCode: 404 });

  const allowed = VALID_TRANSITIONS[visit.status] || [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from "${visit.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`),
      { statusCode: 400 }
    );
  }

  const updates = { status: newStatus };
  const now = new Date();

  if (newStatus === 'triaged') { updates.triagedBy = req.user._id; updates.triageTime = now; }
  if (newStatus === 'in_consultation') { updates.attendedBy = req.user._id; updates.consultationStartTime = now; }
  if (newStatus === 'discharged') { updates.dischargeTime = now; updates.dischargeNotes = extra.notes || ''; updates.followUpDate = extra.followUpDate || null; }
  if (newStatus === 'cancelled') { updates.cancelledAt = now; updates.cancellationReason = extra.reason || ''; }

  Object.assign(visit, updates);
  await visit.save();

  await PatientTimeline.create({
    patient: visit.patient._id || visit.patient,
    activityType: `visit_${newStatus}`,
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { visitId: visit._id.toString(), status: newStatus, ...extra },
  });

  const notifType = newStatus === 'triaged' ? 'triage_completed'
    : newStatus === 'in_consultation' ? 'consultation_started'
    : newStatus === 'lab_ordered' ? 'lab_requested'
    : newStatus === 'in_pharmacy' ? 'prescription_ready'
    : newStatus === 'dispensed' ? 'prescription_dispensed'
    : newStatus === 'discharged' ? 'visit_completed'
    : null;

  if (notifType) {
    await notificationService.notify({
      hospital: visit.hospital || req.staffProfile?.hospital,
      type: notifType,
      title: `Visit ${TRANSITION_LABELS[newStatus] || newStatus}`,
      message: `Patient: ${visit.patient?.name || 'Unknown'} — ${TRANSITION_LABELS[newStatus] || newStatus}`,
      patient: visit.patient?._id || visit.patient,
      patientName: visit.patient?.name,
      link: `/dashboard/clinical/visits/${visit._id}`,
      priority: newStatus === 'cancelled' ? 'critical' : 'normal',
    });
  }

  return visit;
}

async function createVisit(data, req) {
  const visit = await PatientVisit.create({
    patient:      data.patient,
    hospital:     req.staffProfile?.hospital || data.hospital,
    department:   data.department || null,
    visitType:    data.visitType || 'in-person',
    source:       data.source || 'reception',
    checkedInBy:  req.user._id,
    checkInTime:  new Date(),
  });

  await PatientTimeline.create({
    patient: data.patient,
    activityType: 'visit_checked_in',
    performedBy: req.user._id,
    performedByRole: req.user.role,
    performedByName: req.user.fullName,
    metadata: { visitId: visit._id.toString() },
  });

  await notificationService.notify({
    hospital: visit.hospital,
    type: 'patient_checked_in',
    title: 'New patient checked in',
    message: `Patient checked in — awaiting triage`,
    patient: data.patient,
    link: `/dashboard/clinical/triage`,
  });

  return visit;
}

async function getWaitingQueue(hospitalId, statuses = ['checked_in', 'triaged']) {
  return PatientVisit.find({ hospital: hospitalId, status: { $in: statuses } })
    .populate('patient', 'name phone age gender chiefComplaint painLevel triage vitals')
    .sort({ checkInTime: 1 });
}

async function getDoctorQueue(doctorId) {
  return PatientVisit.find({
    attendedBy: doctorId,
    status: { $in: ['in_consultation', 'lab_ordered'] },
  })
    .populate('patient', 'name phone age gender chiefComplaint painLevel triage vitals diagnosis')
    .sort({ consultationStartTime: -1 });
}

async function getActiveVisits(hospitalId, status) {
  const filter = { hospital: hospitalId };
  if (status) filter.status = status;
  return PatientVisit.find(filter)
    .populate('patient', 'name phone age gender chiefComplaint')
    .populate('attendedBy', 'fullName')
    .sort({ createdAt: -1 });
}

async function getVisitById(visitId) {
  return PatientVisit.findById(visitId)
    .populate('patient')
    .populate('checkedInBy', 'fullName')
    .populate('triagedBy', 'fullName')
    .populate('attendedBy', 'fullName')
    .populate('consultation')
    .populate('labRequests')
    .populate('prescriptions')
    .populate('dispenses')
    .populate('referrals');
}

module.exports = {
  PatientVisit,
  transitionVisit,
  createVisit,
  getWaitingQueue,
  getDoctorQueue,
  getActiveVisits,
  getVisitById,
  VALID_TRANSITIONS,
  TRANSITION_LABELS,
};
