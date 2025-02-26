const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  yard: { type: String, required: true, default: 'DefaultYard' }, // Default value
  actionType: { type: String, required: true }, // e.g., "Vehicle Added", "Search Performed"
  description: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('inwardforms', ActivitySchema);