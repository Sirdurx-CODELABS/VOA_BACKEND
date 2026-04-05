const User = require('../models/User');
const Program = require('../models/Program');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const Announcement = require('../models/Announcement');
const WelfareRequest = require('../models/WelfareRequest');
const AuditLog = require('../models/AuditLog');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { log } = require('../services/audit.service');
const { canAssignRole } = require('../config/permissions');
const { createNotification } = require('../services/notification.service');
const { sendWelcomeEmail } = require('../services/email.service');
const bcrypt = require('bcryptjs');

// ─── USERS ────────────────────────────────────────────────────────────────────

exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$or = [
      { fullName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).populate('reportsTo', 'fullName role').sort('-createdAt'),
      User.countDocuments(filter),
    ]);
    return paginated(res, users, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, role, isVice, status } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return error(res, 'Email already registered', 409);

    const user = await User.create({
      fullName, email, password: password || 'VOA@2024!',
      phone, role: role || 'member', isVice: isVice || false,
      status: status || 'active', isEmailVerified: true,
    });

    await log({ actor: req.user, action: 'CREATE_USER', entity: 'User', entityId: user._id, details: { email, role }, ip: req.ip });
    await createNotification({ recipient: user._id, title: 'Account Created', message: 'Your VOA account has been created by the administrator.', type: 'general' });
    sendWelcomeEmail(user.email, user.fullName);

    return success(res, user, 'User created successfully', 201);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) return error(res, 'User not found', 404);

    // Prevent demoting another super_admin
    if (target.role === 'super_admin' && target._id.toString() !== req.user._id.toString()) {
      return error(res, 'Cannot modify another super admin account', 403);
    }

    const allowed = ['fullName', 'phone', 'role', 'isVice', 'status', 'reportsTo', 'profileImage'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Validate role assignment
    if (updates.role && !canAssignRole(req.user.role, updates.role)) {
      return error(res, `Cannot assign role '${updates.role}'`, 403);
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    await log({ actor: req.user, action: 'UPDATE_USER', entity: 'User', entityId: id, details: updates, ip: req.ip });
    return success(res, user, 'User updated');
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return error(res, 'User not found', 404);
    if (target.role === 'super_admin') return error(res, 'Cannot delete a super admin account', 403);
    if (target._id.toString() === req.user._id.toString()) return error(res, 'Cannot delete your own account', 403);

    await User.findByIdAndDelete(req.params.id);
    await log({ actor: req.user, action: 'DELETE_USER', entity: 'User', entityId: req.params.id, details: { email: target.email }, ip: req.ip });
    return success(res, null, 'User deleted');
  } catch (err) { next(err); }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return error(res, 'Password must be at least 6 characters', 400);
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    user.password = newPassword;
    await user.save();
    await log({ actor: req.user, action: 'RESET_PASSWORD', entity: 'User', entityId: req.params.id, ip: req.ip });
    return success(res, null, 'Password reset successfully');
  } catch (err) { next(err); }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    if (user.role === 'super_admin') return error(res, 'Cannot deactivate super admin', 403);
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    await log({ actor: req.user, action: 'TOGGLE_STATUS', entity: 'User', entityId: user._id, details: { status: user.status }, ip: req.ip });
    return success(res, user, `User ${user.status}`);
  } catch (err) { next(err); }
};

// ─── PROGRAMS ─────────────────────────────────────────────────────────────────

exports.getPrograms = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    const [programs, total] = await Promise.all([
      Program.find(filter).skip(skip).limit(limit).populate('createdBy', 'fullName role').populate('assignedMembers', 'fullName').sort('-createdAt'),
      Program.countDocuments(filter),
    ]);
    return paginated(res, programs, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.createProgram = async (req, res, next) => {
  try {
    const program = await Program.create({ ...req.body, createdBy: req.user._id });
    await log({ actor: req.user, action: 'CREATE_PROGRAM', entity: 'Program', entityId: program._id, details: { title: program.title }, ip: req.ip });
    return success(res, program, 'Program created', 201);
  } catch (err) { next(err); }
};

exports.updateProgram = async (req, res, next) => {
  try {
    const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!program) return error(res, 'Program not found', 404);
    await log({ actor: req.user, action: 'UPDATE_PROGRAM', entity: 'Program', entityId: req.params.id, ip: req.ip });
    return success(res, program, 'Program updated');
  } catch (err) { next(err); }
};

exports.deleteProgram = async (req, res, next) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    if (!program) return error(res, 'Program not found', 404);
    await log({ actor: req.user, action: 'DELETE_PROGRAM', entity: 'Program', entityId: req.params.id, details: { title: program.title }, ip: req.ip });
    return success(res, null, 'Program deleted');
  } catch (err) { next(err); }
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

exports.getTransactions = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    const [txs, total] = await Promise.all([
      Transaction.find(filter).skip(skip).limit(limit).populate('createdBy', 'fullName').sort('-createdAt'),
      Transaction.countDocuments(filter),
    ]);
    return paginated(res, txs, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tx) return error(res, 'Transaction not found', 404);
    await log({ actor: req.user, action: 'UPDATE_TRANSACTION', entity: 'Transaction', entityId: req.params.id, ip: req.ip });
    return success(res, tx, 'Transaction updated');
  } catch (err) { next(err); }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return error(res, 'Transaction not found', 404);
    await log({ actor: req.user, action: 'DELETE_TRANSACTION', entity: 'Transaction', entityId: req.params.id, ip: req.ip });
    return success(res, null, 'Transaction deleted');
  } catch (err) { next(err); }
};

// ─── WELFARE ──────────────────────────────────────────────────────────────────

exports.getWelfare = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      WelfareRequest.find(filter).skip(skip).limit(limit).populate('userId', 'fullName email').populate('handledBy', 'fullName').sort('-createdAt'),
      WelfareRequest.countDocuments(filter),
    ]);
    return paginated(res, requests, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.updateWelfare = async (req, res, next) => {
  try {
    const req_ = await WelfareRequest.findByIdAndUpdate(req.params.id, { ...req.body, handledBy: req.user._id }, { new: true });
    if (!req_) return error(res, 'Request not found', 404);
    await log({ actor: req.user, action: 'UPDATE_WELFARE', entity: 'WelfareRequest', entityId: req.params.id, ip: req.ip });
    return success(res, req_, 'Welfare request updated');
  } catch (err) { next(err); }
};

exports.deleteWelfare = async (req, res, next) => {
  try {
    const req_ = await WelfareRequest.findByIdAndDelete(req.params.id);
    if (!req_) return error(res, 'Request not found', 404);
    await log({ actor: req.user, action: 'DELETE_WELFARE', entity: 'WelfareRequest', entityId: req.params.id, ip: req.ip });
    return success(res, null, 'Welfare request deleted');
  } catch (err) { next(err); }
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const a = await Announcement.findByIdAndDelete(req.params.id);
    if (!a) return error(res, 'Announcement not found', 404);
    await log({ actor: req.user, action: 'DELETE_ANNOUNCEMENT', entity: 'Announcement', entityId: req.params.id, ip: req.ip });
    return success(res, null, 'Announcement deleted');
  } catch (err) { next(err); }
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────

exports.deleteReport = async (req, res, next) => {
  try {
    const r = await Report.findByIdAndDelete(req.params.id);
    if (!r) return error(res, 'Report not found', 404);
    await log({ actor: req.user, action: 'DELETE_REPORT', entity: 'Report', entityId: req.params.id, ip: req.ip });
    return success(res, null, 'Report deleted');
  } catch (err) { next(err); }
};

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entity) filter.entity = req.query.entity;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).skip(skip).limit(limit).populate('actor', 'fullName email role').sort('-createdAt'),
      AuditLog.countDocuments(filter),
    ]);
    return paginated(res, logs, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ─── SYSTEM STATS ─────────────────────────────────────────────────────────────

exports.getSystemStats = async (req, res, next) => {
  try {
    const [users, programs, transactions, welfare, logs] = await Promise.all([
      User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Program.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Transaction.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' } } }]),
      WelfareRequest.countDocuments({ status: 'pending' }),
      AuditLog.countDocuments(),
    ]);
    return success(res, { users, programs, transactions, pendingWelfare: welfare, totalAuditLogs: logs });
  } catch (err) { next(err); }
};
