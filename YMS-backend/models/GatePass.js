const mongoose = require('mongoose');

// GatePass schema
const GatePassSchema = new mongoose.Schema({
    name: { type: String, required: true },
    yardname: { type: String, required: true },
    aadharNumber: { type: String, required: true }, // Ensure this matches
    mobileNumber: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    visitortype: {type: String, required: true},
    userPhoto: { type: String },
    aadharPhoto: { type: String },
});


// Create and export the model
module.exports = mongoose.model('GatePass', GatePassSchema);
