// routes/activity.js
const express = require('express');
const router = express.Router();
const { logActivity, getRecentActivities } = require('../controllers/activityController');

// Log a new activity
router.post('/', logActivity);

// Retrieve recent activities
router.get('/', getRecentActivities);

module.exports = router;
