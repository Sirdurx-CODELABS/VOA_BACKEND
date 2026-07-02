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

    const doc = await DocumentTemplate.findById(documentId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const created = [];
    for (const a of approvals) {
      const approval = await DocumentApproval.create({
        documentId,
        templateType: doc.templateType,
        role: a.role,
        label: a.label,
        requestedBy: req.user._id,
        assignedTo: a.assignedTo,
      });
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

    const [items, total] = await Promise.all([
      DocumentApproval.find({ assignedTo: req.user._id, status: 'pending' })
        .populate('documentId', 'name templateType data pdfUrl status')
        .populate('requestedBy', 'fullName email profileImage')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      DocumentApproval.countDocuments({ assignedTo: req.user._id, status: 'pending' }),
    ]);

    return success(res, {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

exports.getApprovalsForDocument = async (req, res, next) => {
  try {
    const approvals = await DocumentApproval.find({ documentId: req.params.id })
      .populate('assignedTo', 'fullName email profileImage')
      .populate('requestedBy', 'fullName email profileImage')
      .sort('createdAt');
    return success(res, approvals);
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const approval = await DocumentApproval.findById(req.params.id);
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

    const doc = await DocumentTemplate.findById(approval.documentId);
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
    const approval = await DocumentApproval.findById(req.params.id);
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

    const doc = await DocumentTemplate.findById(approval.documentId);
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
    const count = await DocumentApproval.countDocuments({ assignedTo: req.user._id, status: 'pending' });
    return success(res, { count });
  } catch (err) { next(err); }
};
