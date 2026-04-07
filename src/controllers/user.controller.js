const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { sendWelcomeEmail } = require('../services/email.service');
const { createNotification } = require('../services/notification.service');
const { uploadToCloudinary } = require('../services/upload.service');
const { canAssignRole } = require('../config/permissions');

exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.membershipType) filter.membershipType = req.query.membershipType;
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

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('reportsTo', 'fullName role email');
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const allowed = ['fullName', 'phone', 'profileImage'];
    // Permission-based field access
    if (req.user.hasPermission('users:assign_role')) {
      allowed.push('role', 'isVice', 'reportsTo', 'status');
    }
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user, 'User updated');
  } catch (err) { next(err); }
};

exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);

    const { role, isVice } = req.body;

    // Roles that can approve: super_admin, chairman, vice_chairman, membership_coordinator + their vice versions
    const approverRole = req.user.role;
    const canApprove = [
      'super_admin', 'chairman', 'vice_chairman', 'membership_coordinator',
    ].includes(approverRole);

    if (!canApprove && !req.user.isVice) {
      return error(res, 'You do not have permission to approve accounts', 403);
    }

    user.status = 'active';
    user.isEmailVerified = true;

    // Optionally assign a role during approval
    if (role) {
      const { canAssignRole } = require('../config/permissions');
      if (!canAssignRole(approverRole, role)) {
        return error(res, `You cannot assign the role '${role}'`, 403);
      }
      user.role = role;
      user.isVice = isVice || false;
    }

    await user.save();

    sendWelcomeEmail(user.email, user.fullName).catch(() => {});

    await createNotification({
      recipient: user._id,
      title: '🎉 Account Approved!',
      message: `Welcome to VOA! Your account has been approved${role ? ` with the role of ${(isVice ? 'Vice ' : '') + role.replace(/_/g, ' ')}` : ''}. You can now log in.`,
      type: 'achievement',
    });

    return success(res, user, 'User approved successfully');
  } catch (err) { next(err); }
};

exports.rejectUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user, 'User rejected');
  } catch (err) { next(err); }
};

exports.assignRole = async (req, res, next) => {
  try {
    const { role, isVice, reportsTo } = req.body;
    if (!role) return error(res, 'Role is required', 400);

    // Double-check permission (belt + suspenders — middleware already checked, but validate here too)
    if (!canAssignRole(req.user.role, role)) {
      return error(res, `You cannot assign the role '${role}'`, 403);
    }

    // Prevent self-demotion for super_admin
    if (req.params.id === req.user._id.toString() && req.user.role === 'super_admin') {
      return error(res, 'Super admin cannot change their own role', 403);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isVice: isVice || false, reportsTo: reportsTo || null },
      { new: true, runValidators: true }
    );
    if (!user) return error(res, 'User not found', 404);

    await createNotification({
      recipient: user._id,
      title: 'Role Updated',
      message: `You have been assigned the role of ${isVice ? 'Vice ' : ''}${role.replace(/_/g, ' ')}`,
      type: 'general',
    });

    return success(res, user, 'Role assigned successfully');
  } catch (err) { next(err); }
};

exports.uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const url = await uploadToCloudinary(req.file.path, 'voa/profiles');
    const user = await User.findByIdAndUpdate(req.user._id, { profileImage: url }, { new: true });
    return success(res, { profileImage: user.profileImage }, 'Profile image updated');
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    return success(res, null, 'User deleted');
  } catch (err) { next(err); }
};

// Every logged-in user can update their OWN profile (any role)
exports.updateMyProfile = async (req, res, next) => {
  try {
    const allowed = ['fullName', 'phone', 'bio', 'state', 'address', 'emergencyContact', 'gender', 'dob', 'interests'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Validate DOB
    if (updates.dob && new Date(updates.dob) > new Date()) {
      return error(res, 'Date of birth cannot be in the future', 400);
    }

    // Re-derive membership type whenever DOB or explicit membershipType hint changes
    // Allow adults to self-declare parent_guardian (they have children) — but enforce age rules
    const { deriveMembershipType } = require('../services/contributionCalc.service');
    const Child = require('../models/Child');
    const dobToUse = updates.dob || req.user.dob;

    if (dobToUse) {
      const childCount = await Child.countDocuments({ parentId: req.user._id });
      // If client explicitly requests parent_guardian and age > 25, honour it
      // (they may be adding children right after this call)
      const wantsParent = req.body.membershipType === 'parent_guardian';
      const hasChildren = childCount > 0 || wantsParent;
      updates.membershipType = deriveMembershipType(dobToUse, hasChildren);
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return success(res, user, 'Profile updated');
  } catch (err) { next(err); }
};
