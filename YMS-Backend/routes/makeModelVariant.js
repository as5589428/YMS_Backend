// routes/makeModel.js
const express = require('express');
const router = express.Router();
const MakeModelDataset = require('../models/makeModelDataset');

// GET request to fetch all documents from the make_model_dataset collection
router.get('/make-model-variant', async (req, res) => {
  try {
    // Fetch all records, specifying the fields you want to return
    const makeModelVariants = await MakeModelDataset.find({}, 'make model variant segment');
    res.status(200).json(makeModelVariants); // Return the records as JSON
  } catch (error) {
    console.error('Server error:', error);  // Log the error for debugging
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
