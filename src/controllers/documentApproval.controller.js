const DocumentApproval = require('../models/DocumentApproval');
const DocumentTemplate = require('../models/DocumentTemplate');
const Notification = require('../models/Notification');
const { success } = require('../utils/apiResponse');

exports.createApprovals = async (req, res, next) => {
  try {
    const { documentId, approvals } = req.body;
    if (!documentId || !Array.isArray(approvals) || approvals.length === 0) {
      return res.status(400).json({ success: false, message: 'documentId and approvals array required' });
    }

    const docFilter = {};
    if (!req.isSuperAdmin && req.allianceOrganizationId) docFilter.allianceOrganizationId = req.allianceOrganizationId;
    const doc = await DocumentTemplate.findOne({ _id: documentId, ...docFilter });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const created = [];
    for (const a of approvals) {
      const approvalData = {
        documentId,
        templateType: doc.templateType,
        role: a.role,
        label: a.label,
        requestedBy: req.user._id,
        assignedTo: a.assignedTo,
      };
      if (req.allianceOrganizationId) approvalData.allianceOrganizationId = req.allianceOrganizationId;
      const approval = await DocumentApproval.create(approvalData);
      created.push(approval);
    }

    doc.status = 'pending_approval';
    await doc.save();

    return success(res, created, 'Approval requests created');
  } catch (err) { next(err); }
};

exports.getMyPendingApprovals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const approvalFilter = { assignedTo: req.user._id, status: 'pending' };
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) approvalFilter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      approvalFilter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const [items, total] = await Promise.all([
      DocumentApproval.find(approvalFilter)
        .populate('documentId', 'name templateType data pdfUrl status')
        .populate('requestedBy', 'fullName email profileImage')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      DocumentApproval.countDocuments(approvalFilter),
    ]);

    return success(res, {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

exports.getApprovalsForDocument = async (req, res, next) => {
  try {
    const filter = { documentId: req.params.id };
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const approvals = await DocumentApproval.find(filter)
      .populate('assignedTo', 'fullName email profileImage')
      .populate('requestedBy', 'fullName email profileImage')
      .sort('createdAt');
    return success(res, approvals);
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const orgFilter = {};
    if (!req.isSuperAdmin && req.allianceOrganizationId) orgFilter.allianceOrganizationId = req.allianceOrganizationId;
    const approval = await DocumentApproval.findOne({ _id: req.params.id, ...orgFilter });
    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
    if (approval.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not assigned to you' });
    }
    if (approval.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Already actioned' });
    }

    approval.status = 'approved';
    approval.signatureUrl = req.body.signatureUrl || req.user.signature || '';
    approval.comment = req.body.comment || '';
    approval.actionedAt = new Date();
    await approval.save();

    const docOrgFilter = {};
    if (!req.isSuperAdmin && req.allianceOrganizationId) docOrgFilter.allianceOrganizationId = req.allianceOrganizationId;
    const doc = await DocumentTemplate.findOne({ _id: approval.documentId, ...docOrgFilter });
    if (doc) {
      const { setValue } = require('../utils/dotProp');
      if (approval.role === 'chairman' || approval.role === 'executive_director') {
        doc.data.signature = approval.signatureUrl;
      }
      if (approval.role === 'finance') {
        doc.data.financeSignature = approval.signatureUrl;
      }
      if (approval.role === 'dept_head') {
        doc.data.deptHeadSignature = approval.signatureUrl;
      }

      const remaining = await DocumentApproval.countDocuments({ documentId: doc._id, status: 'pending' });
      if (remaining === 0) {
        doc.status = 'approved';
      }
      await doc.save();
    }

    await Notification.create({
      recipient: approval.requestedBy,
      title: 'Document Approved',
      message: `"${approval.label}" has been approved for your document.`,
      type: 'document_approval',
    });

    return success(res, approval, 'Approved');
  } catch (err) { next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const orgFilter = {};
    if (!req.isSuperAdmin && req.allianceOrganizationId) orgFilter.allianceOrganizationId = req.allianceOrganizationId;
    const approval = await DocumentApproval.findOne({ _id: req.params.id, ...orgFilter });
    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
    if (approval.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not assigned to you' });
    }
    if (approval.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Already actioned' });
    }

    approval.status = 'rejected';
    approval.comment = req.body.comment || '';
    approval.actionedAt = new Date();
    await approval.save();

    const docOrgFilter = {};
    if (!req.isSuperAdmin && req.allianceOrganizationId) docOrgFilter.allianceOrganizationId = req.allianceOrganizationId;
    const doc = await DocumentTemplate.findOne({ _id: approval.documentId, ...docOrgFilter });
    if (doc) {
      doc.status = 'rejected';
      await doc.save();
    }

    await Notification.create({
      recipient: approval.requestedBy,
      title: 'Document Rejected',
      message: `"${approval.label}" was not approved. ${approval.comment ? `Reason: ${approval.comment}` : ''}`,
      type: 'document_approval',
    });

    return success(res, approval, 'Rejected');
  } catch (err) { next(err); }
};

exports.getPendingCount = async (req, res, next) => {
  try {
    const countFilter = { assignedTo: req.user._id, status: 'pending' };
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) countFilter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      countFilter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const count = await DocumentApproval.countDocuments(countFilter);
    return success(res, { count });
  } catch (err) { next(err); }
};
