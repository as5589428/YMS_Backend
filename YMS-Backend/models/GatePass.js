const mongoose = require('mongoose');

// GatePass schema
const GatePassSchema = new mongoose.Schema({
    name: { type: String, required: true },
    aadharNumber: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    //userPhoto: { type: String, required: true },  // Store as a path or URL
    //aadharPhoto: { type: String, required: true } // Store as a path or URL
}, { timestamps: true });

// Create and export the model
module.exports = mongoose.model('GatePass', GatePassSchema);
