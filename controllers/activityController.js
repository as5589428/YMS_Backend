// controllers/activityController.js
const Activity = require('../models/Activity');

// Log a new activity (e.g., vehicle add, delete, update, search)
exports.logActivity = async (req, res) => {
  const { yard, actionType, description } = req.body;
  try {
    const newActivity = new Activity({ yard, actionType, description });
    await newActivity.save();
    res.status(201).json({ message: 'Activity logged successfully', activity: newActivity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Retrieve recent activities (filtered by userEmail if provided)
exports.getRecentActivities = async (req, res) => {
  const { yard } = req.query;
  try {
    const query = yard ? { yard } : {};
    const activities = await Activity.find(query).sort({ timestamp: -1 });
    res.status(200).json({ activities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
