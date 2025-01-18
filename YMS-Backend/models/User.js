// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    userid: {
        type: String,
        required: true
        // unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
    },
}, {
    timestamps: true, // Optional: adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Admin_Users', userSchema);
