// models/FinanceEmployee.js
const mongoose = require('mongoose');

// const FinanceEmployeeSchema = new mongoose.Schema({
//     empCode: { type: String, required: true, unique: true },
//     name: { type: String, required: true },
//     designation: { type: String, required: true },
//     whatsapp: { type: String, required: true },
//     mobile: { type: String, required: true },
//     companyName: { type: String, required: true },
//     username: { type: String, required: true, unique: true },
//     password: { type: String, required: true }, // Store hashed password
// }, { timestamps: true });



const FinanceEmployeeSchema = new mongoose.Schema({
    empCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    aadharnumber: { type: String, required: true },
    designation: { type: String, required: true },
    whatsapp: { type: String, required: true },
    mobile: { type: String, required: true },
    companyName: { type: String, required: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String },
    aadharImageUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('FinanceEmployee', FinanceEmployeeSchema);
