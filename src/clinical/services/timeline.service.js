const PatientTimeline = require('../../ai/models/PatientTimeline');

/**
 * Record a patient activity in the timeline.
 * Can be called from any controller or service.
 */
const recordTimeline = async ({ patient, activityType, performedBy, performedByRole, performedByName, department, hospital, metadata, source, description }) => {
  try {
    await PatientTimeline.create({
      patient,
      activityType,
      performedBy,
      performedByRole,
      performedByName,
      department,
      hospital,
      metadata: metadata || {},
      source: source || 'web',
      description,
    });
  } catch (err) {
    console.error('Timeline record error:', err.message);
  }
};

/**
 * Create timeline entry from Express req object (extracts user context automatically).
 */
const recordFromRequest = async (req, patientId, activityType, extra = {}) => {
  return recordTimeline({
    patient: patientId,
    activityType,
    performedBy: req.user?._id,
    performedByRole: req.user?.role,
    performedByName: req.user?.fullName,
    department: req.staffProfile?.department,
    hospital: req.staffProfile?.hospital || req.body?.hospital,
    ...extra,
  });
};

module.exports = { recordTimeline, recordFromRequest };
