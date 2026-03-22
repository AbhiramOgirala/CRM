const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const complaintsCtrl = require('../controllers/complaintsController');
const adminCtrl = require('../controllers/adminController');
const locationCtrl = require('../controllers/locationController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// ── Auth ──────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);
router.put('/auth/change-password', authenticate, authCtrl.changePassword);

// ── NLP Preview ───────────────────────────────────────────────────
router.post('/nlp/preview', complaintsCtrl.previewClassification);
router.post('/nlp/generate-title', complaintsCtrl.generateTitle);

// ── Complaints ────────────────────────────────────────────────────
router.post('/complaints', authenticate, complaintsCtrl.fileComplaint);
router.get('/complaints/my', authenticate, complaintsCtrl.getComplaints);
router.get('/complaints/delete-reasons', authenticate, complaintsCtrl.getCitizenDeleteReasons);
router.get('/complaints/hotspots', complaintsCtrl.getHotspots);
router.get('/complaints/dashboard', optionalAuth, complaintsCtrl.getDashboardStats);
router.get('/complaints', optionalAuth, complaintsCtrl.getComplaints);
router.get('/complaints/:id', optionalAuth, complaintsCtrl.getComplaintById);
router.delete('/complaints/:id', authenticate, authorize('citizen'), complaintsCtrl.deleteComplaintByCitizen);
router.put('/complaints/:id/status', authenticate, authorize('officer', 'admin', 'super_admin'), complaintsCtrl.updateComplaintStatus);
router.post('/complaints/:id/assign', authenticate, authorize('admin', 'super_admin'), complaintsCtrl.assignComplaint);
router.post('/complaints/:id/upvote', authenticate, complaintsCtrl.upvoteComplaint);
router.post('/complaints/:complaint_id/comments', authenticate, locationCtrl.addComment);

// ── Location hierarchy ────────────────────────────────────────────
router.get('/location/states', locationCtrl.getStates);
router.get('/location/districts/:state_id', locationCtrl.getDistricts);
router.get('/location/corporations/:district_id', locationCtrl.getCorporations);
router.get('/location/municipalities/:district_id', locationCtrl.getMunicipalities);
router.get('/location/talukas/:district_id', locationCtrl.getTalukas);
router.get('/location/mandals/:taluka_id', locationCtrl.getMandals);
router.get('/location/gram-panchayats/:mandal_id', locationCtrl.getGramPanchayats);

// ── Leaderboard ───────────────────────────────────────────────────
router.get('/leaderboard/citizens', locationCtrl.getCitizenLeaderboard);
router.get('/leaderboard/departments', locationCtrl.getDeptLeaderboard);
router.get('/leaderboard/officers', locationCtrl.getOfficerLeaderboard);
router.get('/leaderboard/area', locationCtrl.getAreaLeaderboard);
router.get('/leaderboard/district', locationCtrl.getDistrictLeaderboard);

// ── Notifications ─────────────────────────────────────────────────
router.get('/notifications', authenticate, locationCtrl.getNotifications);
router.put('/notifications/read', authenticate, locationCtrl.markNotificationsRead);
router.delete('/notifications/:id', authenticate, locationCtrl.deleteNotification);

// ── Admin ─────────────────────────────────────────────────────────
router.get('/admin/users', authenticate, authorize('admin', 'super_admin'), adminCtrl.getAllUsers);
router.post('/admin/officers', authenticate, authorize('admin', 'super_admin'), adminCtrl.createOfficer);
router.put('/admin/users/:id/toggle-status', authenticate, authorize('admin', 'super_admin'), adminCtrl.toggleUserStatus);
router.put('/admin/users/:id/department', authenticate, authorize('admin', 'super_admin'), adminCtrl.assignOfficerDept);
router.get('/admin/departments', authenticate, adminCtrl.getDepartments);
router.get('/admin/stats', authenticate, authorize('admin', 'super_admin'), adminCtrl.getSystemStats);
router.get('/admin/escalated', authenticate, authorize('admin', 'super_admin'), adminCtrl.getEscalated);
router.post('/admin/geocode-complaints', authenticate, authorize('admin', 'super_admin'), complaintsCtrl.geocodeExistingComplaints);

module.exports = router;
