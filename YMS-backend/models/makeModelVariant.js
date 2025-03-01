// models/makeModelDataset.js
const mongoose = require('mongoose');

// Define the schema based on fields in the MongoDB collection
const makeModelDatasetSchema = new mongoose.Schema({
    Make: String,
    Model: String,
    Variant: String,
    Segment: String,
    'Sub Segment': String // Note the space in field name
});

// Export the model to be used in the routes
module.exports = mongoose.model('MakeModelDataset', makeModelDatasetSchema, 'make_model_dataset');
