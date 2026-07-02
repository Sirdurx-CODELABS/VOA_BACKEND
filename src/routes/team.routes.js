const express = require('express');
const router = require('express').Router();
const ctrl = require('../controllers/team.controller');
const { protect, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getPublicTeam);

// Protected routes
router.use(protect);
router.get('/', requirePermission('view_team'), ctrl.getAllTeamMembers);
router.get('/:id', requirePermission('view_team'), ctrl.getTeamMember);
router.post('/', requirePermission('manage_team'), upload.single('photo'), ctrl.createTeamMember);
router.put('/:id', requirePermission('manage_team'), upload.single('photo'), ctrl.updateTeamMember);
router.delete('/:id', requirePermission('manage_team'), ctrl.deleteTeamMember);

module.exports = router;
