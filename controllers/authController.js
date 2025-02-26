// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Forgot Password: Send OTP
exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    
    // Generate a 6-digit OTP and set expiry (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail',  // or your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    // HTML email template (inline)
    const htmlTemplate = `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You have requested to reset your password. Please use the OTP below to proceed:</p>
            <h1 style="color: #007BFF; text-align: center;">${otp}</h1>
            <p>This OTP is valid for <strong>10 minutes</strong>.</p>
            <p>If you did not request this, please ignore this email.</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">Thank you,<br>Aiyrat Recopath Solutions</p>
          </div>
        </body>
      </html>
    `;
    
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Your Password Reset OTP',
      html: htmlTemplate,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return res.status(500).json({ message: "Error sending OTP email", error });
      res.status(200).json({ message: "OTP sent successfully" });
    });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Forgot Password: Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });
    
    // Clear OTP fields after verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reset Password (Optional)
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
