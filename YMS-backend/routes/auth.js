// routes/auth.js
const express = require('express');
const router = express.Router();
// const { sendOTP, verifyOTP, resetPassword } = require('../controllers/authController');
const userController = require('../controllers/authController'); 
// // Forgot Password Endpoints
// router.post('/send-otp', sendOTP);
// router.post('/verify-otp', verifyOTP);
// router.post('/reset-password', resetPassword);


// Routes
router.post('/send-email-otp', userController.sendEmailOTP); // Send OTP via Email (for password reset)
router.post('/send-mobile-otp', userController.sendMobileOTP); // Send OTP via SMS (for registration)
router.post('/verify-otp', userController.verifyOTP); // Verify OTP (common for both email and mobile)
router.post('/reset-password', userController.resetPassword); // Reset password (for email OTP)

module.exports = router;
