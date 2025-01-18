const mongoose = require('mongoose');

// Define Yardowners Schema
const yardOwnersSchema = new mongoose.Schema({
    yardname: { type: String, required: true },
    contact_person: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
});

// Create and Export the Model
const YardOwners = mongoose.model('yardowners', yardOwnersSchema);

module.exports = YardOwners;
