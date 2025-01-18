const mongoose = require('mongoose');

// Define the Rate_Chart schema
const rateChartSchema = new mongoose.Schema({
    ClientSegment: { type: String, required: true }, // Field for Client Segment
    Rate: { type: Number, required: true },          // Field for Rate
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps automatically

// Create and export the model
const Rate_Chart = mongoose.model('Rate_Chart', rateChartSchema,'Rate_Chart');

module.exports = Rate_Chart;
