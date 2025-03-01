const User = require('../models/User');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
// const twilio = require('twilio');

// Initialize Twilio client
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory store for OTPs
const otpStore = {};

// Function to generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Function to send OTP via Email
exports.sendEmailOTP = async (req, res) => {
  const { email } = req.body;
  try {
    // Check if the user exists (for password reset)
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Generate a 6-digit OTP and set expiry (10 minutes)
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store OTP in memory with expiry
    otpStore[email] = { otp, otpExpires: otpExpiry };

    // Debugging: Log the stored OTP
    console.log('Stored OTP for email:', otpStore[email]);

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // or your email service
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

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
        return res.status(500).json({ message: "Error sending OTP email", error });
      }
      console.log('OTP sent via email:', info);
      res.status(200).json({ message: "OTP sent successfully" });
    });
  } catch (err) {
    console.error('Error in sendEmailOTP:', err);
    res.status(500).json({ message: err.message });
  }
};

// Function to send OTP via SMS (for registration)
// exports.sendMobileOTP = async (req, res) => {
//   const { phone_number } = req.body;
//   try {
//     // Generate a 6-digit OTP and set expiry (10 minutes)
//     const otp = generateOTP();
//     const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

//     // Store OTP in memory with expiry
//     otpStore[phone_number] = { otp, otpExpires: otpExpiry };

//     // Debugging: Log the stored OTP
//     console.log('Stored OTP for phone:', otpStore[phone_number]);

//     // Send OTP via Twilio SMS
//     const message = await client.messages.create({
//       body: `Your OTP is: ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: phone_number,
//     });

//     console.log('OTP sent via SMS:', message.sid);
//     res.status(200).json({ message: 'OTP sent successfully' });
//   } catch (err) {
//     console.error('Error in sendMobileOTP:', err);
//     res.status(500).json({ message: err.message });
//   }
// };

// Function to verify OTP (common for both email and mobile)
exports.verifyOTP = async (req, res) => {
  const { email, phone_number, otp } = req.body;

  try {
    // Determine if the OTP is for email or phone
    const key = email || phone_number;
    if (!key) return res.status(400).json({ message: 'Email or phone number is required' });

    // Debugging: Log the entire otpStore
    console.log('Current otpStore:', otpStore);

    // Check if OTP exists in memory and is not expired
    const storedOTP = otpStore[key];
    console.log('Stored OTP for key:', storedOTP);

    if (!storedOTP) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    console.log('Received OTP:', otp);
    console.log('Stored OTP:', storedOTP.otp);

    // Check if the OTP matches and if it hasn't expired
    if (storedOTP.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (storedOTP.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // OTP verified, remove from memory
    delete otpStore[key];

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Error in verifyOTP:', err);
    res.status(500).json({ message: err.message });
  }
};

// Function to reset password (for email OTP)
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Hash the new password and update the user record
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error in resetPassword:', err);
    res.status(500).json({ message: err.message });
  }
};