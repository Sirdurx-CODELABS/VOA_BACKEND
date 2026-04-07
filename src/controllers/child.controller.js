const Child = require('../models/Child');
const User = require('../models/User');
const { success, error } = require('../utils/apiResponse');
const { deriveMembershipType } = require('../services/contributionCalc.service');
const { generateAccessToken } = require('../utils/generateToken');

// ─── Helper: re-evaluate parent's membershipType after child changes ──────────
const syncParentMembership = async (parentId) => {
  const parent = await User.findById(parentId);
  if (!parent || !parent.dob) return;
  const childCount = await Child.countDocuments({ parentId });
  const derived = deriveMembershipType(parent.dob, childCount > 0);
  if (parent.membershipType !== derived) {
    parent.membershipType = derived;
    await parent.save({ validateBeforeSave: false });
  }
};

// ─── GET MY CHILDREN ──────────────────────────────────────────────────────────
exports.getMyChildren = async (req, res, next) => {
  try {
    const parentId = req.params.parentId || req.user._id;
    if (parentId.toString() !== req.user._id.toString()) {
      const allowed = ['super_admin', 'chairman', 'membership_coordinator', 'secretary'];
      if (!allowed.includes(req.user.role)) return error(res, 'Not authorized', 403);
    }
    const children = await Child.find({ parentId }).sort('childName');
    return success(res, children);
  } catch (err) { next(err); }
};

// ─── ADD CHILD ────────────────────────────────────────────────────────────────
exports.addChild = async (req, res, next) => {
  try {
    const parentId = req.params.parentId || req.user._id;
    if (parentId.toString() !== req.user._id.toString() &&
        req.user.role !== 'super_admin' && req.user.role !== 'chairman') {
      return error(res, 'Not authorized', 403);
    }

    const { childName, childDob, childGender, relationship } = req.body;
    if (!childName || !childDob) return error(res, 'Child name and date of birth are required', 400);
    if (new Date(childDob) > new Date()) return error(res, 'Date of birth cannot be in the future', 400);

    const child = await Child.create({ parentId, childName, childDob, childGender, relationship });

    // Auto-update parent membership type
    await syncParentMembership(parentId);

    return success(res, child, 'Child added successfully', 201);
  } catch (err) { next(err); }
};

// ─── UPDATE CHILD ─────────────────────────────────────────────────────────────
exports.updateChild = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) return error(res, 'Child record not found', 404);

    if (child.parentId.toString() !== req.user._id.toString() &&
        req.user.role !== 'super_admin' && req.user.role !== 'chairman') {
      return error(res, 'Not authorized', 403);
    }

    const allowed = ['childName', 'childDob', 'childGender', 'relationship'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.childDob && new Date(updates.childDob) > new Date()) {
      return error(res, 'Date of birth cannot be in the future', 400);
    }

    const updated = await Child.findByIdAndUpdate(req.params.childId, updates, { new: true });
    return success(res, updated, 'Child updated');
  } catch (err) { next(err); }
};

// ─── DELETE CHILD ─────────────────────────────────────────────────────────────
exports.deleteChild = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) return error(res, 'Child record not found', 404);

    if (child.parentId.toString() !== req.user._id.toString() &&
        req.user.role !== 'super_admin' && req.user.role !== 'chairman') {
      return error(res, 'Not authorized', 403);
    }

    const parentId = child.parentId;
    await Child.findByIdAndDelete(req.params.childId);

    // Auto-revert parent membership if no children remain
    await syncParentMembership(parentId);

    return success(res, null, 'Child removed');
  } catch (err) { next(err); }
};

// ─── CREATE CHILD ACCOUNT ─────────────────────────────────────────────────────
// POST /api/children/my/:childId/create-account
exports.createChildAccount = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) return error(res, 'Child record not found', 404);

    // Only the parent can create an account for their child
    if (child.parentId.toString() !== req.user._id.toString()) {
      return error(res, 'Not authorized', 403);
    }

    if (child.hasAccount) {
      return error(res, 'An account has already been created for this child', 409);
    }

    // Child must be at least 14
    const { calcAge } = require('../services/contributionCalc.service');
    const childAge = calcAge(child.childDob);
    if (childAge === null || childAge < 14) {
      return error(res, 'Child must be at least 14 years old to create an account', 400);
    }

    const { email, password, phone, interests } = req.body;
    if (!email || !password) return error(res, 'Email and password are required', 400);

    const existing = await User.findOne({ email });
    if (existing) return error(res, 'Email already registered', 409);

    // Membership type auto-derived from child's age (will be adolescent for 14–25)
    const membershipType = deriveMembershipType(child.childDob, false);

    const newUser = await User.create({
      fullName: child.childName,
      email,
      password,
      phone: phone || '',
      gender: child.childGender || 'other',
      dob: child.childDob,
      membershipType,
      interests: interests || [],
      isEmailVerified: true,
      status: 'pending', // still needs admin approval
      role: 'member',
    });

    // Link child record to the new user account
    child.hasAccount = true;
    child.linkedUserId = newUser._id;
    await child.save();

    // Notify approvers
    const approvers = await User.find({
      role: { $in: ['super_admin', 'chairman', 'membership_coordinator'] },
      status: 'active',
    }).select('_id');

    const { createNotification } = require('../services/notification.service');
    for (const approver of approvers) {
      createNotification({
        recipient: approver._id,
        title: 'New Member Registration (Child Account)',
        message: `${child.childName} (child of ${req.user.fullName}) has been registered and is awaiting approval.`,
        type: 'general',
      }).catch(() => {});
    }

    return success(res,
      { id: newUser._id, email: newUser.email, membershipType: newUser.membershipType, status: newUser.status },
      'Child account created successfully. Awaiting admin approval.',
      201
    );
  } catch (err) { next(err); }
};
