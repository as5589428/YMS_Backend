const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    userid: {
        type: String,
        required: true,
        unique: true, // Ensure userid is unique
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
    email: {
        type: String,
        required: true,
        unique: true, // Ensure email is unique
        trim: true, // Remove extra spaces
        lowercase: true, // Convert email to lowercase
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'], // Validate email format
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number'], // Validate phone number format
    },
    profileImage: {
        type: String,
        required: true, // Profile image is compulsory
    },
}, {
    timestamps: true, // Optional: adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Admin_Users', userSchema);