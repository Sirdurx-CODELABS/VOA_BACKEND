const TreasuryAccount = require('../models/TreasuryAccount');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.create = async (req, res, next) => {
  try {
    const { accountName, bankName, accountNumber, accountHolderName } = req.body;
    const accountData = {
      accountName, bankName, accountNumber, accountHolderName,
      createdBy: req.user._id,
    };
    if (req.allianceOrganizationId) accountData.allianceOrganizationId = req.allianceOrganizationId;
    const account = await TreasuryAccount.create(accountData);
    return success(res, account, 'Account created', 201);
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    // Non-treasurer only sees active accounts
    if (!['treasurer', 'chairman', 'super_admin'].includes(req.user.role)) {
      filter.isActive = true;
    }
    if (!req.isSuperAdmin) {
      filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const accounts = await TreasuryAccount.find(filter)
      .populate('createdBy', 'fullName')
      .sort('-createdAt');
    return success(res, accounts);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['accountName', 'bankName', 'accountNumber', 'accountHolderName', 'isActive'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const acctUpdateFilter = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      acctUpdateFilter.allianceOrganizationId = req.allianceOrganizationId;
    }
    const account = await TreasuryAccount.findOneAndUpdate(acctUpdateFilter, updates, { new: true });
    if (!account) return error(res, 'Account not found', 404);
    return success(res, account, 'Account updated');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const acctDelFilter = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      acctDelFilter.allianceOrganizationId = req.allianceOrganizationId;
    }
    const account = await TreasuryAccount.findOneAndDelete(acctDelFilter);
    if (!account) return error(res, 'Account not found', 404);
    return success(res, null, 'Account deleted');
  } catch (err) { next(err); }
};
