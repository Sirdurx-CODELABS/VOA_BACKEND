const express = require('express');
const router = require('express').Router();
const ctrl = require('../controllers/team.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getPublicTeam);

// Protected routes — Super Admin only for content management
router.use(protect);
router.get('/', isSuperAdmin, ctrl.getAllTeamMembers);
router.get('/:id', isSuperAdmin, ctrl.getTeamMember);
router.post('/', isSuperAdmin, upload.single('photo'), ctrl.createTeamMember);
router.put('/:id', isSuperAdmin, upload.single('photo'), ctrl.updateTeamMember);
router.delete('/:id', isSuperAdmin, ctrl.deleteTeamMember);

module.exports = router;
