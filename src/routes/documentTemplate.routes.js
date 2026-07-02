const express = require('express');
const {
  createDocumentTemplate,
  getDocumentTemplatesByUser,
  getAllDocumentTemplates,
  getDocumentTemplateById,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  copyDocumentTemplate,
  uploadDocumentFile
} = require('../controllers/documentTemplate.controller');
const { protect, isSuperAdmin, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .post(protect, createDocumentTemplate)
  .get(protect, getDocumentTemplatesByUser);

router.get('/admin/all', protect, requireRole('super_admin', 'chairman'), getAllDocumentTemplates);

router.post('/upload', protect, upload.single('file'), uploadDocumentFile);
router.get('/users/list', protect, async (req, res) => {
  const User = require('../models/User');
  try {
    const users = await User.find({ status: 'active' }).select('fullName email phone role profileImage');
    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.route('/:id')
  .get(protect, getDocumentTemplateById)
  .put(protect, updateDocumentTemplate)
  .delete(protect, deleteDocumentTemplate);

router.route('/:id/copy')
  .post(protect, copyDocumentTemplate);

module.exports = router;
