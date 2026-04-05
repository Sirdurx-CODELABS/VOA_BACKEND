const Report = require('../models/Report');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { uploadMany } = require('../services/upload.service');

exports.createReport = async (req, res, next) => {
  try {
    let attachments = [];
    if (req.files?.length) {
      attachments = await uploadMany(req.files, 'voa/reports');
    }
    const report = await Report.create({ ...req.body, createdBy: req.user._id, attachments });
    return success(res, report, 'Report created', 201);
  } catch (err) { next(err); }
};

exports.getAllReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.programId) filter.programId = req.query.programId;
    if (req.query.type) filter.type = req.query.type;

    const [reports, total] = await Promise.all([
      Report.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .populate('programId', 'title date')
        .sort('-createdAt'),
      Report.countDocuments(filter),
    ]);
    return paginated(res, reports, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'fullName role')
      .populate('programId', 'title date');
    if (!report) return error(res, 'Report not found', 404);
    return success(res, report);
  } catch (err) { next(err); }
};

exports.updateReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return error(res, 'Report not found', 404);
    if (report.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'chairman') {
      return error(res, 'Not authorized', 403);
    }
    Object.assign(report, req.body);
    await report.save();
    return success(res, report, 'Report updated');
  } catch (err) { next(err); }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return error(res, 'Report not found', 404);
    return success(res, null, 'Report deleted');
  } catch (err) { next(err); }
};
