const Attendance = require('../models/Attendance');
const Program = require('../models/Program');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { updateEngagementScore } = require('../services/engagement.service');

exports.recordAttendance = async (req, res, next) => {
  try {
    const { userId, programId, status, notes } = req.body;

    const program = await Program.findById(programId);
    if (!program) return error(res, 'Program not found', 404);

    const existing = await Attendance.findOne({ userId, programId });
    if (existing) {
      // Update existing record
      const oldStatus = existing.status;
      existing.status = status;
      existing.notes = notes;
      existing.recordedBy = req.user._id;
      await existing.save();

      // Adjust engagement score
      if (oldStatus !== status) {
        if (status === 'present') await updateEngagementScore(userId, 'present');
        else await updateEngagementScore(userId, 'absent');
      }
      return success(res, existing, 'Attendance updated');
    }

    const attData = { userId, programId, status, notes, recordedBy: req.user._id };
    if (req.allianceOrganizationId) attData.allianceOrganizationId = req.allianceOrganizationId;
    const attendance = await Attendance.create(attData);
    await updateEngagementScore(userId, status);
    return success(res, attendance, 'Attendance recorded', 201);
  } catch (err) { next(err); }
};

exports.bulkRecordAttendance = async (req, res, next) => {
  try {
    const { programId, records } = req.body; // records: [{userId, status}]
    const program = await Program.findById(programId);
    if (!program) return error(res, 'Program not found', 404);

    const results = await Promise.allSettled(
      records.map(async ({ userId, status, notes }) => {
        const attData_bulk = { userId, programId, status, notes, recordedBy: req.user._id, timestamp: new Date() };
        if (req.allianceOrganizationId) attData_bulk.allianceOrganizationId = req.allianceOrganizationId;
        const att = await Attendance.findOneAndUpdate(
          { userId, programId },
          attData_bulk,
          { upsert: true, new: true }
        );
        await updateEngagementScore(userId, status);
        return att;
      })
    );

    const saved = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    return success(res, { count: saved.length }, 'Bulk attendance recorded');
  } catch (err) { next(err); }
};

exports.getProgramAttendance = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = { programId: req.params.programId };
    if (req.query.status) filter.status = req.query.status;
    if (!req.isSuperAdmin) {
      filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter).skip(skip).limit(limit)
        .populate('userId', 'fullName email')
        .populate('recordedBy', 'fullName'),
      Attendance.countDocuments(filter),
    ]);
    return paginated(res, records, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getUserAttendance = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const findFilter = { userId };
    if (!req.isSuperAdmin) {
      findFilter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      findFilter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const records = await Attendance.find(findFilter)
      .populate('programId', 'title date status')
      .sort('-timestamp');
    return success(res, records);
  } catch (err) { next(err); }
};

exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const summaryFilter = { programId };
    if (!req.isSuperAdmin) {
      summaryFilter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      summaryFilter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const [present, absent, total] = await Promise.all([
      Attendance.countDocuments({ ...summaryFilter, status: 'present' }),
      Attendance.countDocuments({ ...summaryFilter, status: 'absent' }),
      Attendance.countDocuments(summaryFilter),
    ]);
    return success(res, { total, present, absent, attendanceRate: total ? ((present / total) * 100).toFixed(1) : 0 });
  } catch (err) { next(err); }
};
