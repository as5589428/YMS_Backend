// server.js
const express = require('express');
const fs = require('fs');
const moment = require('moment');
const crypto = require('crypto');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const multer = require('multer');
const User = require('./models/User');
const YardOwner = require('./models/YardOwner');
const InwardDraft = require('./models/InwardDraft');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const FinanceEmployee = require('./models/FinanceEmployee');
const InwardForm = require('./models/InwardForm');
const makeModelDataset = require('./models/makeModelVariant');  // Import the route
// const StateCityPincode = require('./models/StateCityPincode');
const cloudinary = require('cloudinary').v2;
const yardRoutes = require('./routes/yardRoutes');
// const makeModelDataset = require('./models/makeModelDataset'); // Import your model
const Razorpay = require('razorpay');

const GatePass = require('./models/GatePass');
const FinanceReview = require('./models/FinanceReview');
const path = require('path');
const StateCityPincode = require('./models/StateCityPincode');
const Rate_Chart = require('./models/Rate_Chart');
const OutwardForm = require('./models/OutwardForm');

const Reminder = require('./models/Reminders');
dotenv.config();
const router = express.Router();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});


require('dotenv').config(); // Load environment variables

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
 // Set up multer to handle multiple photo uploads
const storage = multer.diskStorage({ 
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Save files to 'uploads' folder temporarily
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    console.log(req.files); 
  }
});
const upload = multer({ storage: storage });

// Object to store the Cloudinary URLs for each view

// const fs = require('fs');
// const cloudinary = require('cloudinary').v2;

// const uploadToCloudinary = (filePath, fieldName, folderType, yardname = null) => {
//   // Determine the folder based on the type
//   let folderPath;
//   if (folderType === 'vehicle_photos') {
//     const uniqueId = Date.now(); // Generate a unique ID for vehicle photos
//     folderPath = `vehicle_photos/${uniqueId}`;
//   } else if (folderType === 'yard-owner-profile') {
//     if (!yardname) {
//       throw new Error('Yardname is required for yard-owner-profile uploads');
//     }
//     folderPath = `yard-owner-profile/${yardname}`;
//   } else {
//     throw new Error('Invalid folder type specified');
//   }

//   // Upload to Cloudinary
//   return cloudinary.uploader.upload(filePath, {
//     folder: folderPath,
//     public_id: `${Date.now()}_${fieldName}`, // Use a timestamp and fieldName for unique public IDs
//     resource_type: 'image',
//   })
//     .then(result => {
//       const uploadedUrl = result.secure_url; // Save the secure URL
//       fs.unlinkSync(filePath); // Remove the temporary file
//       return uploadedUrl; // Return the URL for further use
//     })
//     .catch(error => {
//       console.error(`Error uploading ${fieldName} to Cloudinary:`, error);
//       throw error; // Ensure the error propagates
//     });
// };

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 5 * 1024 * 1024 }
// }).any(); // Accepts any field

// Function to generate a 4-5 digit unique ID
async function generateUniqueID() {
  // Generate a random 4-5 digit number
  const randomId = Math.floor(1000 + Math.random() * 9000); // Generates a number between 1000 and 9999
  
  // Check if this ID already exists in the database to ensure uniqueness
  const exists = await InwardForm.findOne({ uniqueId: randomId });
  if (exists) {
    // Recursively call the function if the ID already exists
    return generateUniqueID();
  }
  
  return randomId;
}

// Simple endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the login API!');
});


// Add these imports at the top of server.js


//Admin Registration endpoint

// POST /register endpoint
app.post('/api/register', upload.single('profileImage'), async (req, res) => {
  const { name, userid, password, address, pincode, email, phoneNumber } = req.body;

  // Validate required fields
  if (!userid || !email || !password || !req.file) {
      return res.status(400).json({ message: 'User ID, email, password, and profile image are required.' });
  }

  // Check if email or userid already exists
  const existingUserByEmail = await User.findOne({ email });
  if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already exists.' });
  }

  const existingUserById = await User.findOne({ userid });
  if (existingUserById) {
      return res.status(400).json({ message: 'User ID already exists.' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Upload the file to Cloudinary
  let cloudinaryResult;
  try {
      cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'admin_images', // Save the image in the 'admin_images' folder on Cloudinary
      });
  } catch (error) {
      return res.status(500).json({ message: 'Error uploading image to Cloudinary: ' + error.message });
  }

  // Delete the temporary file from the 'uploads' folder
  fs.unlink(req.file.path, (err) => {
      if (err) {
          console.error('Error deleting temporary file:', err);
      }
  });

  // Create a new user instance
  const user = new User({
      name,
      userid,
      password: hashedPassword,
      address,
      pincode,
      email,
      phoneNumber,
      profileImage: cloudinaryResult.secure_url, // Save the Cloudinary URL
  });

  try {
      await user.save();
      res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
      // Handle duplicate email or other errors
      if (error.code === 11000) {
          return res.status(400).json({ message: 'Email or User ID already exists.' });
      }
      res.status(400).json({ message: 'Error registering user: ' + error.message });
  }
});
// Admin Login endpoint
app.post('/login', async (req, res) => {
    const { userid, password } = req.body;

    try {
        const user = await User.findOne({ userid });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get User Profile endpoint
app.get('/api/profile', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID from decoded token
      const user = await User.findById(decoded.id).select('-password'); // Exclude password field
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Send user profile
      res.json({ user });
  } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(403).json({ message: 'Invalid or expired token' });
  }
});

// YardOwner Login endpoint
// Register YardOwner API
// Register API 
app.post('/yardowner/register', upload.single('photo'), async (req, res) => {
  const {
      yardname,
      contact_person,
      state,
      district,
      city,
      pincode,
      phone,
      email,
      address,
      password,
  } = req.body;

  try {
      // Check if yardname or email already exists
      const existingYardOwner = await YardOwner.findOne({ yardname });
      const existingEmail = await YardOwner.findOne({ email });

      if (existingYardOwner) {
          return res.status(400).json({ message: 'Yardname already exists' });
      }

      if (existingEmail) {
          return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Upload photo to Cloudinary
      let photoUrl = null;
      if (req.file) {
          const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
              folder: `yard-owner-profile/${yardname}`,
              public_id: `photo_${Date.now()}`,
              resource_type: 'image',
          });

          photoUrl = cloudinaryResult.secure_url;

          // Remove the file from the local uploads folder after upload
          fs.unlinkSync(req.file.path);
      }

      // Create a new YardOwner
      const yardOwner = new YardOwner({
          yardname,
          contact_person,
          state,
          district,
          city,
          pincode,
          phone,
          email,
          address,
          password: hashedPassword,
          photo: photoUrl, // Store the Cloudinary URL in the database
      });

      await yardOwner.save();

      res.status(201).json({
          success: true,
          message: 'YardOwner registered successfully',
          data: {
              yardname,
              contact_person,
              state,
              district,
              city,
              pincode,
              phone,
              email,
              address,
              photo: photoUrl,
          },
      });
  } catch (error) {
      console.error('Error during registration:', error.message);
      res.status(500).json({ success: false, message: 'Error registering YardOwner', error: error.message });
  }
});

// YardOwner Login Endpoint
app.post('/yardowner/login', async (req, res) => {
  const { yardname, password } = req.body;

  try {
      // Check if the YardOwner exists
      const yardOwner = await YardOwner.findOne({ yardname });
      if (!yardOwner) {
          return res.status(400).json({ success: false, message: 'Invalid yard name or password' });
      }

      // Compare the entered password with the stored hashed password
      const isMatch = await bcrypt.compare(password, yardOwner.password);
      if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Invalid yard name or password' });
      }

      // Generate JWT Token with yardname as primary field
      const token = jwt.sign(
          { yardname: yardOwner.yardname }, // Only store yardname to track user session
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
      );

      // Send success response with token and yard name
      res.status(200).json({
          success: true,
          message: 'Login successful',
          token,
          yardname: yardOwner.yardname
      });

  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error, please try again later' });
  }
});







// Finance Login & Regiser 


// Finance Login & Regiser 

// Route to handle finance employee registration
app.post('/finance/register', upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'aadharImage', maxCount: 1 }]), async (req, res) => {
  const { empCode, name, email, aadharnumber, designation, whatsapp, mobile, companyName, password } = req.body;
  const profileImageFile = req.files['profileImage'] ? req.files['profileImage'][0] : null;
  const aadharImageFile = req.files['aadharImage'] ? req.files['aadharImage'][0] : null;

  // Validate that all required fields are provided
  if (!empCode || !name || !email || !aadharnumber || !designation || !whatsapp || !mobile || !companyName || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if the employee code already exists
    const existingEmpCode = await FinanceEmployee.findOne({ empCode });
    if (existingEmpCode) {
      return res.status(400).json({ message: 'Employee Code already exists' });
    }

    // Upload profile image to Cloudinary
    const profileImageResult = profileImageFile ? await cloudinary.uploader.upload(profileImageFile.path, { folder: 'financeregisteration' }) : null;
    const aadharImageResult = aadharImageFile ? await cloudinary.uploader.upload(aadharImageFile.path, { folder: 'financeregisteration' }) : null;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new FinanceEmployee instance
    const financeEmployee = new FinanceEmployee({
      empCode,
      name,
      email,
      aadharnumber,
      designation,
      whatsapp,
      mobile,
      companyName,
      password: hashedPassword,
      profileImageUrl: profileImageResult ? profileImageResult.secure_url : null,
      aadharImageUrl: aadharImageResult ? aadharImageResult.secure_url : null
    });

    // Save the new finance employee to the database
    await financeEmployee.save();
    res.status(201).json({ message: 'Finance Employee registered successfully.' });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error registering finance employee:', error);
    res.status(400).json({ message: 'Error registering finance employee: ' + error.message });
  }
});

// Finance Employee Login endpoint
app.post('/finance/login', async (req, res) => {
  const { empCode, password } = req.body;

  try {
      const financeEmployee = await FinanceEmployee.findOne({ empCode });
      if (!financeEmployee) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, financeEmployee.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      // Generate JWT token
      const token = jwt.sign({ id: financeEmployee._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
  } catch (error) {
      res.status(500).json({ message: 'Server error' });
  }
});

// Route to get the profile data of a finance employee by empCode
app.get('/finance/profile/:empCode', async (req, res) => {
  const { empCode } = req.params;

  try {
    // Find the finance employee by empCode
    const financeEmployee = await FinanceEmployee.findOne({ empCode });

    if (!financeEmployee) {
      return res.status(404).json({ message: 'Finance Employee not found' });
    }

    // Send the profile data as a JSON response
    res.status(200).json({
      empCode: financeEmployee.empCode,
      name: financeEmployee.name,
      email: financeEmployee.email,
      aadharNumber: financeEmployee.aadharnumber, // Ensure this matches the frontend expectation
      designation: financeEmployee.designation,
      whatsapp: financeEmployee.whatsapp,
      mobile: financeEmployee.mobile,
      companyName: financeEmployee.companyName,
      profileImageUrl: financeEmployee.profileImageUrl, // Ensure this field exists in the model
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Route to create a new gate pass
// Updated route without photo handling
// Route to create a new gate pass
const { body, validationResult } = require('express-validator');
app.post(
  '/finance/gatepass',
  upload.fields([{ name: 'userPhoto', maxCount: 1 }, { name: 'aadharPhoto', maxCount: 1 }]),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('yardname').notEmpty().withMessage('Yard name is required'),
    body('aadharNumber').notEmpty().withMessage('Aadhar Number is required'),
    body('mobileNumber').notEmpty().withMessage('Mobile Number is required'),
    body('vehicleNumber').notEmpty().withMessage('Vehicle Number is required'),
    body('visitortype').notEmpty().withMessage('Visitor Type is Required '),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, yardname, aadharNumber, mobileNumber, vehicleNumber, visitortype } = req.body;

    try {
      // Helper function to upload a file to Cloudinary
      const uploadToCloudinary = (file) => {
        console.log('Uploading file to Cloudinary:', file.path);
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload(file.path, { folder: 'finance_gatepass' }, (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload result:', result);
              resolve(result.secure_url);
            }
          });
        });
      };

      // Log files for debugging
      console.log('Files:', req.files);

      // Upload user photo and aadhar photo to Cloudinary if they exist
      const userPhotoUrl = req.files['userPhoto'] ? await uploadToCloudinary(req.files['userPhoto'][0]) : null;
      const aadharPhotoUrl = req.files['aadharPhoto'] ? await uploadToCloudinary(req.files['aadharPhoto'][0]) : null;

      // Cleanup local files after upload
      if (req.files['userPhoto']) fs.unlinkSync(req.files['userPhoto'][0].path);
      if (req.files['aadharPhoto']) fs.unlinkSync(req.files['aadharPhoto'][0].path);

      // Create new gate pass entry
      const newGatePass = new GatePass({
        name,
        yardname,
        aadharNumber,
        mobileNumber,
        vehicleNumber,
        visitortype,
        userPhoto: userPhotoUrl,
        aadharPhoto: aadharPhotoUrl,
      });

      await newGatePass.save();
      res.status(201).json({ message: 'Gate pass created successfully.', data: newGatePass });
    } catch (error) {
      console.error('Error creating gate pass:', error);
      res.status(500).json({ message: 'Error creating gate pass', error: error.message });
    }
  }
);


// Route to get gate pass details by ID
app.get('/finance/gatepass/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const gatePass = await GatePass.findById(id);
    if (!gatePass) {
      return res.status(404).json({ message: 'Gate pass not found' });
    }

    res.status(200).json(gatePass);
  } catch (error) {
    console.error('Error retrieving gate pass:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all the gate pass 
// Route to get all gate passes
app.get('/finance/gatepass', async (req, res) => {
  try {
    const gatePasses = await GatePass.find(); // Fetch all gate passes from MongoDB
    res.status(200).json({ success: true, data: gatePasses });
  } catch (error) {
    console.error('Error fetching gate passes:', error);
    res.status(500).json({ success: false, message: 'Error fetching gate passes', error: error.message });
  }
});



//Finance Stockmanagement 

//Finance Stockmanagement 
//Finance Stockmanagement 
//Finance Stockmanagement 

app.post('/finance/stock', async (req, res) => {
  try {
    let { clientName } = req.body;

    if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
      return res.status(400).json({ message: 'Client name is required' });
    }

    clientName = clientName.trim(); // Trim spaces

    console.log("🔍 Searching for client:", clientName);

    // Debug: Show all stored client names
    const allClients = await InwardForm.find({}, { clientName: 1, _id: 0 });
    console.log("📋 All clients in DB:", allClients);

    // Case-insensitive search, allowing spaces
    const vehicles = await InwardForm.find({
      clientName: { $regex: "^\\s*" + clientName + "\\s*$", $options: "i" }
    });

    console.log("📊 Vehicles found:", vehicles.length);

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found for the given client' });
    }

    // Count total vehicles
    const totalVehicles = vehicles.length;

    // Group vehicles by segments
    const segments = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.segment] = (acc[vehicle.segment] || 0) + 1;
      return acc;
    }, {});

    // Group vehicles by yards and segments within each yard
    const yards = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.yard]) acc[vehicle.yard] = {};
      acc[vehicle.yard][vehicle.segment] = (acc[vehicle.yard][vehicle.segment] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: "Vehicle data fetched successfully",
      totalVehicles,
      segments,
      yards,
    });
  } catch (error) {
    console.error("❌ Error fetching vehicle data:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Finance Review Post and Get 
// Function to generate a Unique 4-5 digit number 

async function generateUniqueReviewId() {
  let isUnique = false;
  let newId;

  while (!isUnique) {
      newId = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit ID
      const existingReview = await FinanceReview.findOne({ reviewId: newId });
      if (!existingReview) {
          isUnique = true;
      }
  }

  return newId;
}

// Finance Review Post 

app.post('/api/reviews', async (req, res) => {
  try {
      const { reviewText } = req.body;
      if (!reviewText) {
          return res.status(400).json({ message: "Review text is required" });
      }

      const reviewId = await generateUniqueReviewId(); // Get a unique 4-5 digit ID
      const newReview = new FinanceReview({ reviewId, reviewText });

      await newReview.save();

      res.status(201).json({ message: "Review added successfully", review: newReview });
  } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({ message: "Server error" });
  }
});
// Finance Payment Reminder  

// Function to generate a unique 4-digit reminderId
const generateReminderId = async () => {
  let uniqueId;
  let exists = true;

  while (exists) {
      uniqueId = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit number
      const existingReminder = await Reminder.findOne({ reminderId: uniqueId });
      exists = !!existingReminder;
  }

  return uniqueId;
};

// Create Reminder
app.post('/reminders', async (req, res) => {
  try {
      const reminderId = await generateReminderId(); // Generate unique 4-digit ID
      const newReminder = new Reminder({ ...req.body, reminderId });

      await newReminder.save();
      res.status(201).json(newReminder);
  } catch (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({ message: 'Error creating reminder', error: error.message });
  }
});

// Get All Reminders
app.get('/reminders', async (req, res) => {
  try {
      const reminders = await Reminder.find();
      res.status(200).json(reminders);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching reminders', error });
  }
});

// Delete Reminder (Now using reminderId instead of _id)
app.delete('/reminders/:reminderId', async (req, res) => {
  try {
      const deletedReminder = await Reminder.findOneAndDelete({ reminderId: req.params.reminderId });
      if (!deletedReminder) {
          return res.status(404).json({ message: 'Reminder not found' });
      }
      res.status(200).json({ message: 'Reminder deleted', deletedReminder });
  } catch (error) {
      res.status(500).json({ message: 'Error deleting reminder', error });
  }
});

// Finance Review Get

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await FinanceReview.find(); // Use FinanceReview instead of Review
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});






//     // Generate a unique 4-5 digit ID
//     const uniqueId = await generateUniqueID(); // Ensure generateUniqueID() is a valid async function

//     // Validate required fields before proceeding
//     if (!req.body.clientName || !req.body.agreementNumber ) {
//       return res.status(400).json({ message: 'Client Name and Agreement Number are required' });
//     }

//     // Create the inward form data
//     const inwardData = new InwardForm({
//       uniqueId, // Add the generated unique ID here
      
//       clientName: req.body.clientName,
//       agreementNumber: req.body.agreementNumber,
//       make: req.body.make,
//       model: req.body.model,
//       variant: req.body.variant,
//       yom:req.body.yom,
//       refNo: req.body.refNo,
//       segment: req.body.segment,
//       loanNo: req.body.loanNo,
//       fuelType: req.body.fuelType,
//       odometerReading: req.body.odometerReading,
//       yard: req.body.yard,
//       inwardDateTime: req.body.inwardDateTime,
//       geoLocation: req.body.geoLocation,

//       // Safely access nested vehicle details
//       vehicleDetails: {
//         customerName: req.body.vehicleDetails?.customerName || '',
//         engineNumber: req.body.vehicleDetails?.engineNumber || '',
//         chassisNumber: req.body.vehicleDetails?.chassisNumber || '',
//         color: req.body.vehicleDetails?.color || '',
//         vehicleClass: req.body.vehicleDetails?.vehicleClass || '',
//         vehicleCondition: req.body.vehicleDetails?.vehicleCondition || '',
//         keyLocation: req.body.vehicleDetails?.keyLocation || '',
//         transmission: req.body.vehicleDetails?.transmission || '',
//         remarks: req.body.vehicleDetails?.remarks || '',
//       },

//       // Assuming checklist is an array of objects, make sure it is properly handled
//       checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
//     });

//     // Save the inward form data to the database
//     const savedInward = await inwardData.save();
//     res.status(201).json({
//       message: 'Inward form data saved successfully',
//       data: savedInward,
//     });
//   } catch (err) {
//     // Improved error logging for better debugging
//     console.error('Error saving inward form data:', err);
//     res.status(400).json({
//       message: 'Error saving inward form data',
//       error: err.message,
//     });
//   }
// });

// POST endpoint

// POST API to handle image upload and form data submission
// app.post('/api/inward', upload.single('vahan_image'), async (req, res) => {
//   try {
//     // Generate a unique ID
//     const uniqueId = await generateUniqueID();

//     // Validate required fields
//     if (!req.body.clientName || !req.body.agreementNumber) {
//       return res.status(400).json({ message: 'Client Name and Agreement Number are required' });
//     }

//     // Upload the `vahan_image` to Cloudinary
//     let vahanImageUrl = null;
//     if (req.file) {
//       // Upload the image to Cloudinary and save the URL
//       vahanImageUrl = await uploadToCloudinary(req.file.path, 'vahan-image'); // Specify the folder name here
//     }

//     console.log('Uploaded File:', req.file);

//     // Create the inward form data
//     const inwardData = new InwardForm({
//       uniqueId,
//       clientName: req.body.clientName,
//       agreementNumber: req.body.agreementNumber,
//       make: req.body.make,
//       model: req.body.model,
//       variant: req.body.variant,
//       yom: req.body.yom,
//       refNo: req.body.refNo,
//       segment: req.body.segment,
//       loanNo: req.body.loanNo,
//       fuelType: req.body.fuelType,
//       odometerReading: req.body.odometerReading,
//       yard: req.body.yard,
//       inwardDateTime: req.body.inwardDateTime,
//       geoLocation: req.body.geoLocation,
//       vehicleDetails: {
//         customerName: req.body.vehicleDetails?.customerName || '',
//         engineNumber: req.body.vehicleDetails?.engineNumber || '',
//         chassisNumber: req.body.vehicleDetails?.chassisNumber || '',
//         color: req.body.vehicleDetails?.color || '',
//         vehicleClass: req.body.vehicleDetails?.vehicleClass || '',
//         vehicleCondition: req.body.vehicleDetails?.vehicleCondition || '',
//         keyLocation: req.body.vehicleDetails?.keyLocation || '',
//         transmission: req.body.vehicleDetails?.transmission || '',
//         remarks: req.body.vehicleDetails?.remarks || '',
//       },
//       checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
//       vahanImage: vahanImageUrl, // Save the Cloudinary URL
//     });

//     // Save the inward form data to the database
//     const savedInward = await inwardData.save();
//     res.status(201).json({
//       message: 'Inward form data saved successfully',
//       data: savedInward,
//     });
//   } catch (err) {
//     console.error('Error processing inward form data:', err);
//     res.status(500).json({
//       message: 'Error processing inward form data',
//       error: err.message,
//     });
//   }
// });

const secretKey = process.env.JWT_SECRET;// Use the same secret key from login
async function uploadToCloudinary(filePath, folderName) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}
// app.post('/api/inward', upload.single('vahan_image'), async (req, res) => {
//   try {
//     // Extract the JWT token from the Authorization header
//     const token = req.headers.authorization?.split(' ')[1]; // Extract token after "Bearer "

//     if (!token) {
//       return res.status(401).json({ message: 'Unauthorized: No token provided' });
//     }

//     // Verify the token and extract user data
//     let decoded;
//     try {
//       decoded = jwt.verify(token, secretKey);
//     } catch (error) {
//       return res.status(403).json({ message: 'Token verification failed', error: error.message });
//     }

//     // Extract userId from the decoded token
//     const userId = decoded.userId; // Ensure your token contains userId during generation

//     // Generate a unique ID
//     const uniqueId = await generateUniqueID();

//     // Validate required fields
//     if (!req.body.clientName || !req.body.agreementNumber) {
//       return res.status(400).json({ message: 'Client Name and Agreement Number are required' });
//     }

//     // Upload the vahan_image to Cloudinary
//     let vahanImageUrl = null;

//     if (req.file) {
//       vahanImageUrl = await uploadToCloudinary(req.file.path, 'vahan-image');
//     }
//     if (!req.file) {
//       console.log('No file uploaded');
//     } else {
//       console.log('File uploaded:', req.file);
//     }
//     // Create the inward form data
//     const inwardData = new InwardForm({
//       userId, // Store the user ID from token
//       uniqueId,
//       clientName: req.body.clientName,
//       agreementNumber: req.body.agreementNumber,
//       make: req.body.make,
//       model: req.body.model,
//       variant: req.body.variant,
//       yom: req.body.yom,
//       refNo: req.body.refNo,
//       segment: req.body.segment,
//       loanNo: req.body.loanNo,
//       fuelType: req.body.fuelType,
//       odometerReading: req.body.odometerReading,
//       yard: req.body.yard,
//       inwardDateTime: req.body.inwardDateTime,
//       geoLocation: req.body.geoLocation,
//       vehicleDetails: {
//         customerName: req.body.vehicleDetails?.customerName || '',
//         engineNumber: req.body.vehicleDetails?.engineNumber || '',
//         chassisNumber: req.body.vehicleDetails?.chassisNumber || '',
//         color: req.body.vehicleDetails?.color || '',
//         vehicleClass: req.body.vehicleDetails?.vehicleClass || '',
//         vehicleCondition: req.body.vehicleDetails?.vehicleCondition || '',
//         keyLocation: req.body.vehicleDetails?.keyLocation || '',
//         transmission: req.body.vehicleDetails?.transmission || '',
//         remarks: req.body.vehicleDetails?.remarks || '',
//       },
//       checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
//       vahanImage: vahanImageUrl,
//     });

//     // Save the inward form data to the database
//     const savedInward = await inwardData.save();
//     res.status(201).json({
//       message: 'Inward form data saved successfully',
//       data: savedInward,
//     });
//   } catch (err) {
//     console.error('Error processing inward form data:', err);
//     res.status(500).json({
//       message: 'Error processing inward form data',
//       error: err.message,
//     });
//   }
// });







// OUTWARD API - ABDUL

// Outward API
// Outward API Route

// Defining a route to fetch inward data


app.post('/api/inward', upload.fields([
  { name: 'vahan_image', maxCount: 1 },
  { name: 'preIntimationLetter', maxCount: 1 },
  { name: 'postIntimationLetter', maxCount: 1 },
  { name: 'authorizationLetter', maxCount: 1 }
]), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (error) {
      return res.status(403).json({ message: 'Token verification failed', error: error.message });
    }

    const userId = decoded.userId;
    const formStatus = req.body.status || "submitted";
    let existingDraft = await InwardDraft.findOne({ uniqueId: req.body.uniqueId });
    const uniqueId = existingDraft ? existingDraft.uniqueId : await generateUniqueID();

    if (formStatus === "submitted" && (!req.body.clientName || !req.body.agreementNumber)) {
      return res.status(400).json({ message: 'Client Name and Agreement Number are required' });
    }

    // Upload images if provided
    const uploadImage = async (file, folder) => file ? await uploadToCloudinary(file.path, folder) : null;

    let vahanImageUrl = await uploadImage(req.files?.vahan_image?.[0], 'vahan-image');
    let preIntimationLetterUrl = await uploadImage(req.files?.preIntimationLetter?.[0], 'pre-intimation-letter');
    let postIntimationLetterUrl = await uploadImage(req.files?.postIntimationLetter?.[0], 'post-intimation-letter');
    let authorizationLetterUrl = await uploadImage(req.files?.authorizationLetter?.[0], 'authorization-letter');

    if (formStatus === "draft") {
      const draftData = {
        userId,
        uniqueId,
        clientName: req.body.clientName,
        agreementNumber: req.body.agreementNumber,
        make: req.body.make,
        model: req.body.model,
        variant: req.body.variant,
        yom: req.body.yom,
        refNo: req.body.refNo,
        segment: req.body.segment,
        loanNo: req.body.loanNo,
        fuelType: req.body.fuelType,
        odometerReading: req.body.odometerReading,
        yard: req.body.yard,
        inwardDateTime: req.body.inwardDateTime,
        geoLocation: req.body.geoLocation,
        vehicleDetails: {
          customerName: req.body.vehicleDetails?.customerName || '',
          engineNumber: req.body.vehicleDetails?.engineNumber || '',
          chassisNumber: req.body.vehicleDetails?.chassisNumber || '',
          color: req.body.vehicleDetails?.color || '',
          vehicleClass: req.body.vehicleDetails?.vehicleClass || '',
          vehicleCondition: req.body.vehicleDetails?.vehicleCondition || '',
          keyLocation: req.body.vehicleDetails?.keyLocation || '',
          transmission: req.body.vehicleDetails?.transmission || '',
          remarks: req.body.vehicleDetails?.remarks || '',
        },
        checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
        vahanImage: vahanImageUrl,
        preIntimationLetter: preIntimationLetterUrl,
        postIntimationLetter: postIntimationLetterUrl,
        authorizationLetter: authorizationLetterUrl,
        lastUpdated: new Date(),
        status: "draft"
      };

      await InwardDraft.findOneAndUpdate({ uniqueId }, draftData, { upsert: true, new: true });
      return res.status(200).json({ message: 'Draft saved successfully', uniqueId });
    }

    await InwardDraft.deleteOne({ uniqueId });

    const inwardData = new InwardForm({
      userId,
      uniqueId,
      clientName: req.body.clientName,
      agreementNumber: req.body.agreementNumber,
      make: req.body.make,
      model: req.body.model,
      variant: req.body.variant,
      yom: req.body.yom,
      refNo: req.body.refNo,
      segment: req.body.segment,
      loanNo: req.body.loanNo,
      fuelType: req.body.fuelType,
      odometerReading: req.body.odometerReading,
      yard: req.body.yard,
      inwardDateTime: req.body.inwardDateTime,
      geoLocation: req.body.geoLocation,
      vehicleDetails: {
        customerName: req.body.vehicleDetails?.customerName || '',
        engineNumber: req.body.vehicleDetails?.engineNumber || '',
        chassisNumber: req.body.vehicleDetails?.chassisNumber || '',
        color: req.body.vehicleDetails?.color || '',
        vehicleClass: req.body.vehicleDetails?.vehicleClass || '',
        vehicleCondition: req.body.vehicleDetails?.vehicleCondition || '',
        keyLocation: req.body.vehicleDetails?.keyLocation || '',
        transmission: req.body.vehicleDetails?.transmission || '',
        remarks: req.body.vehicleDetails?.remarks || '',
      },
      checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
      vahanImage: vahanImageUrl,
      preIntimationLetter: preIntimationLetterUrl,
      postIntimationLetter: postIntimationLetterUrl,
      authorizationLetter: authorizationLetterUrl,
    });

    const savedInward = await inwardData.save();
    res.status(201).json({ message: 'Inward form submitted successfully', data: savedInward });
  } catch (err) {
    console.error('Error processing inward form data:', err);
    res.status(500).json({ message: 'Error processing inward form data', error: err.message });
  }
});

app.post('/api/inward/:id/photos', upload.fields([
  { name: 'frontView', maxCount: 1 },
  { name: 'rightView', maxCount: 1 },
  { name: 'backView', maxCount: 1 },
  { name: 'leftView', maxCount: 1 },
  { name: 'engineView', maxCount: 1 },
  { name: 'meterReading', maxCount: 1 },
  { name: 'tyre1', maxCount: 1 },
  { name: 'tyre2', maxCount: 1 },
  { name: 'tyre3', maxCount: 1 },
  { name: 'tyre4', maxCount: 1 },
  { name: 'tyre5', maxCount: 1 },
  { name: 'tyre6', maxCount: 1 },
  { name: 'tyre7', maxCount: 1 },
  { name: 'tyre8', maxCount: 1 },
  { name: 'tyre9', maxCount: 1 },
  { name: 'tyre10', maxCount: 1 },
  { name: 'stepneyTyre', maxCount: 1 } // Added stepneyTyre here
]), async (req, res) => {
  try {
    const uniqueId = req.params.id;

    // Validate the uniqueId
    if (!uniqueId) {
      return res.status(400).json({ message: 'Unique ID is required' });
    }

    // Find the inward form by uniqueId
    const inwardForm = await InwardForm.findOne({ uniqueId: uniqueId });
    if (!inwardForm) {
      return res.status(404).json({ message: 'Inward form not found' });
    }

    // Helper function to upload files to Cloudinary
    const uploadToCloudinary = async (filePath, fieldName, folderType = 'vehicle_photos', yardname = null) => {
      let folderPath;

      switch (folderType) {
        case 'vehicle_photos':
          folderPath = `vehicle_photos/${uniqueId}`;
          break;

        case 'yard-owner-profile':
          if (!yardname) {
            throw new Error('Yardname is required for yard-owner-profile uploads');
          }
          folderPath = `yard-owner-profile/${yardname}`;
          break;

        default:
          throw new Error(`Invalid folder type specified: ${folderType}`);
      }

      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: folderPath,
          public_id: `${Date.now()}_${fieldName}`,
          resource_type: 'image',
        });

        fs.unlinkSync(filePath); // Remove the local file after upload
        return result.secure_url;
      } catch (error) {
        console.error(`Error uploading ${fieldName} to Cloudinary:`, error);
        throw new Error(`Failed to upload ${fieldName}`);
      }
    };

    const uploadedPhotos = {};

    // Step 3: Upload files to Cloudinary
    console.log('Files received:', req.files);
    const uploadPromises = Object.keys(req.files).map(async (fieldName) => {
      const file = req.files[fieldName][0];
      const uploadedUrl = await uploadToCloudinary(file.path, fieldName);
      uploadedPhotos[fieldName] = uploadedUrl;
    });

    await Promise.all(uploadPromises); // Wait for all uploads to complete

    // Step 4: Update inward form with the uploaded photo URLs
    inwardForm.vehiclePhotos = {
      frontView: uploadedPhotos.frontView || null,
      rightView: uploadedPhotos.rightView || null,
      backView: uploadedPhotos.backView || null,
      leftView: uploadedPhotos.leftView || null,
      engineView: uploadedPhotos.engineView || null,
      meterReading: uploadedPhotos.meterReading || null
    };

    inwardForm.tyrePhotos = {};
    for (let i = 1; i <= 10; i++) {
      const tyreField = `tyre${i}`;
      inwardForm.tyrePhotos[tyreField] = uploadedPhotos[tyreField] || null;
    }
 // Add stepneyTyre to tyrePhotos
 inwardForm.tyrePhotos.stepneyTyre = uploadedPhotos.stepneyTyre || null; // Added stepneyTyre here
    // Step 5: Save the updated inward form
    const updatedInward = await inwardForm.save();

    res.status(200).json({
      message: 'Photos uploaded successfully',
      uniqueId: uniqueId,
      data: updatedInward,
    });
  } catch (err) {
    console.error('Error details:', err);
    res.status(400).json({
      message: 'Error uploading photos',
      error: err.message,
    });
  }
});


const cron = require('node-cron');
const axios = require('axios'); // For making API calls

cron.schedule('*/10 * * * *', async () => {
  try {
    const timeoutPeriod = 30 * 60 * 1000; // 30 minutes
    const cutoffTime = new Date(Date.now() - timeoutPeriod);

    const staleDrafts = await InwardDraft.find({ 
      status: "draft", 
      lastUpdated: { $lt: cutoffTime } 
    });

    for (const draft of staleDrafts) {
      // Call the "move to pending" API
      try {
        const response = await axios.post('http://192.168.1.8:5000/move-to-pending', {
          draftId: draft._id
        });

        console.log(`Moved draft ${draft._id} to pending:`, response.data);
      } catch (apiError) {
        console.error(`Failed to move draft ${draft._id} to pending:`, apiError);
      }
    }

    console.log(`Checked drafts, ${staleDrafts.length} sent to pending`);
  } catch (error) {
    console.error("Failed to check and update drafts:", error);
  }
});


 
// Save Draft API
app.post('/api/inward/draft', async (req, res) => {
  try {
    console.log('📥 Received draft data:', req.body);

    const draftData = req.body;
    draftData.lastUpdated = new Date();
    
    // Ensure refNo is a string
    if (draftData.refNo) {
      draftData.refNo = String(draftData.refNo);
    } else {
      // Generate a reference number if not provided
      draftData.refNo = `REF-${Date.now().toString().slice(-6)}`;
    }

    // Set initial status if not provided
    if (!draftData.status) {
      draftData.status = 'safe_draft';
    }

    // Save or update the draft
    const draft = await InwardDraft.findOneAndUpdate(
      { uniqueId: draftData.uniqueId },
      draftData,
      { upsert: true, new: true }
    );

    console.log('✅ Draft saved successfully:', draft);

    res.status(200).json({
      status: "success",
      message: "Draft saved successfully",
      data: {
        draftId: draft.uniqueId,
        refNo: draft.refNo,
        status: draft.status
      }
    });
  } catch (error) {
    console.error('❌ Error saving draft:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to save draft",
      error: error.message
    });
  }
});

// Move to Pending API
app.post('/api/inward/:uniqueId/move-to-pending', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const { reason } = req.body;

    console.log(`📥 Moving form ${uniqueId} to pending`);

    // First check if the form exists
    const existingForm = await InwardDraft.findOne({ uniqueId });
    
    if (!existingForm) {
      return res.status(404).json({
        status: "error",
        message: "Form not found"
      });
    }

    // Update the form status and reason
    const updatedForm = await InwardDraft.findOneAndUpdate(
      { uniqueId },
      { 
        status: "pending",
        reason,
        lastUpdated: new Date(),
        // Ensure refNo is a string
        refNo: existingForm.refNo ? String(existingForm.refNo) : `REF-${Date.now().toString().slice(-6)}`
      },
      { new: true }
    );

    console.log('✅ Form moved to pending:', updatedForm);

    res.status(200).json({
      status: "success",
      message: "Form moved to pending section",
      data: {
        uniqueId: updatedForm.uniqueId,
        status: updatedForm.status,
        refNo: updatedForm.refNo
      }
    });
  } catch (error) {
    console.error('❌ Error moving to pending:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to move form to pending",
      error: error.message
    });
  }
});

// Get Forms by Status API
app.get('/api/inward/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    console.log(`📥 Fetching forms with status: ${status}`);

    // Validate status
    const validStatuses = ['safe_draft', 'pending', 'incomplete'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find forms with the specified status
    const forms = await InwardDraft.find({ status });

    // Process forms to ensure refNo is always a string
    const processedForms = forms.map(form => {
      const formObj = form.toObject();
      
      // Ensure refNo is a string
      if (!formObj.refNo) {
        formObj.refNo = `REF-${form._id.toString().slice(-6)}`;
      } else {
        formObj.refNo = String(formObj.refNo);
      }

      return formObj;
    });

    console.log(`✅ Found ${processedForms.length} ${status} forms`);

    res.status(200).json({
      status: "success",
      message: `${status} forms retrieved successfully`,
      data: processedForms
    });
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.status} forms:`, error);
    res.status(500).json({
      status: "error",
      message: `Failed to fetch ${req.params.status} forms`,
      error: error.message
    });
  }
});

// Check Form Completion API
app.get('/api/inward/:uniqueId/check-completion', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    console.log(`📥 Checking completion for form: ${uniqueId}`);

    // Find the form
    const form = await InwardDraft.findOne({ uniqueId });

    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found"
      });
    }

    // Define required fields
    const requiredFields = [
      'clientName',
      'agreementNumber',
      'make',
      'model',
      'refNo'
    ];

    // Check if all required fields are filled
    const missingFields = requiredFields.filter(field => !form[field]);
    const isComplete = missingFields.length === 0;

    console.log(`✅ Form completion check - Complete: ${isComplete}`);
    if (!isComplete) {
      console.log('Missing fields:', missingFields);
    }

    res.status(200).json({
      status: "success",
      message: isComplete ? "Form is complete" : "Form is incomplete",
      data: {
        isComplete,
        missingFields: missingFields,
        uniqueId: form.uniqueId,
        currentStatus: form.status
      }
    });
  } catch (error) {
    console.error('❌ Error checking form completion:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to check form completion",
      error: error.message
    });
  }
});


//Refilling of the Forms of Pending
app.get('/api/inward/:uniqueId/refill', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    console.log(`📥 Fetching form for refill: ${uniqueId}`);

    // Find the form in the database
    const form = await InwardDraft.findOne({ uniqueId });

    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found"
      });
    }

    // Return the form data
    res.status(200).json({
      status: "success",
      message: "Form data fetched successfully",
      data: form
    });
  } catch (error) {
    console.error('❌ Error fetching form for refill:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch form data",
      error: error.message
    });
  }
});

// Deletion of the pending form by the user
app.delete('/api/inward/:uniqueId/reject', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    console.log(`📥 Rejecting form: ${uniqueId}`);

    // Find and delete the form
    const deletedForm = await InwardDraft.findOneAndDelete({ uniqueId });

    if (!deletedForm) {
      return res.status(404).json({
        status: "error",
        message: "Form not found"
      });
    }

    // Return success response
    res.status(200).json({
      status: "success",
      message: "Form rejected and deleted successfully",
      data: {
        uniqueId: deletedForm.uniqueId,
        refNo: deletedForm.refNo
      }
    });
  } catch (error) {
    console.error('❌ Error rejecting form:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to reject form",
      error: error.message
    });
  }
});


// submit form from InwardDraft to Inward Form
app.post('/api/inward/:uniqueId/submit', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    console.log(`📥 Submitting form: ${uniqueId}`);

    // Find the form in the InwardDraft collection
    const form = await InwardDraft.findOne({ uniqueId });

    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found"
      });
    }

    // Move the form to the InwardForm collection (or update status)
    const submittedForm = new InwardForm(form.toObject()); // Assuming InwardForm is another schema
    await submittedForm.save();

    // Delete the form from the InwardDraft collection
    await InwardDraft.findOneAndDelete({ uniqueId });

    // Return success response
    res.status(200).json({
      status: "success",
      message: "Form submitted successfully",
      data: {
        uniqueId: submittedForm.uniqueId,
        refNo: submittedForm.refNo,
        status: "submitted"
      }
    });
  } catch (error) {
    console.error(' Error submitting form:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to submit form",
      error: error.message
    });
  }
});
app.get('/outward/:uniqueId', async (req, res) => {
  try {
    const uniqueId = Number(req.params.uniqueId);
    
    // Validate uniqueId is a number
    if (isNaN(uniqueId)) {
      return res.status(400).json({ message: 'Invalid Unique ID format' });
    }

    const inwardData = await InwardForm.findOne({ uniqueId });
    
    if (!inwardData) {
      return res.status(404).json({ message: 'Inward form not found' });
    }

    res.status(200).json({
      success: true,
      data: inwardData
    });
  } catch (error) {
    console.error('Error fetching inward data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching inward data',
      error: error.message 
    });
  }
});


  //MMV API
// MMV API - Add this new dataset fetching API

// Use the route for fetching the makeModelVariant dataset
app.get('/api/makeModelDataset', async (req, res) => {
    try {
        const makeModelVariants = await makeModelDataset.find({}, 'Make Model Variant Segment');
        res.status(200).json(makeModelVariants);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// app.get('/api/inward/:uniqueId', async (req, res) => {
//   const { uniqueId } = req.params;

//   console.log('Received request for uniqueId:', uniqueId);  // Log to check route access

//   try {
//     // Ensure uniqueId is treated as a number (since MongoDB stores it as a number)
//     const numericUniqueId = Number(uniqueId); 

//     // Validate that the uniqueId is a valid number
//     if (isNaN(numericUniqueId)) {
//       console.log('Invalid Unique ID format: Not a valid number');
//       return res.status(400).json({ message: 'Invalid Unique ID format' });
//     }

//     // Query the InwardForm collection for the uniqueId
//     const inwardForm = await InwardForm.findOne({ uniqueId: numericUniqueId });
 
//     // Check if the form exists
//     if (!inwardForm) {
//       console.log('No InwardForm found for uniqueId:', numericUniqueId);
//       return res.status(404).json({ message: `No Inward form found for Unique ID: ${numericUniqueId}` });
//     }

//     // Return the found InwardForm
//     res.status(200).json({
//       message: 'Inward form retrieved successfully',
//       data: inwardForm,
//     });

//   } catch (err) {
//     console.error(`Error fetching InwardForm for Unique ID: ${uniqueId}`, err);

//     res.status(500).json({
//       message: 'Internal Server Error while fetching the Inward form',
//       error: err.message,
//     });
//   }
// });




app.get('/api/inward/:uniqueId', async (req, res) => {
  const { uniqueId } = req.params;
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from header

  console.log('Received request for uniqueId:', uniqueId);

  try {
    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify token and extract user details
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(403).json({ message: 'Token verification failed', error: error.message });
    }

    // Ensure uniqueId is treated as a number
    const numericUniqueId = Number(uniqueId);

    // Validate that the uniqueId is a valid number
    if (isNaN(numericUniqueId)) {
      console.log('Invalid Reference Number format: Not a valid number');
      return res.status(400).json({ message: 'Invalid Reference Number format' });
    }

    // Query the InwardForm collection for the uniqueId
    const inwardForm = await InwardForm.findOne({ uniqueId: numericUniqueId });

    // Check if the form exists
    if (!inwardForm) {
      console.log(`No InwardForm found for Reference Number: ${numericUniqueId}`);
      return res.status(404).json({ message: `No Inward form found for Reference Number: ${numericUniqueId}` });
    }

    // Return the found InwardForm
    res.status(200).json({
      message: 'Inward form retrieved successfully',
      data: inwardForm,
    });

  } catch (err) {
    console.error(`Error fetching InwardForm for Reference Number: ${uniqueId}`, err);

    res.status(500).json({
      message: 'Internal Server Error while fetching the Inward form',
      error: err.message,
    });
  }
});


// app.get('/api/inward', async (req, res) => {
//   try {
//     // Extract token from Authorization header
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({ message: 'Unauthorized: No token provided' });
//     }

//     // Verify token and extract yardname
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       return res.status(403).json({ message: 'Token verification failed', error: error.message });
//     }

//     // Fetch data only for the logged-in yard
//     const inwardData = await InwardForm.find({ yard: decoded.yardname });

//     res.status(200).json({ success: true, data: inwardData });

//   } catch (error) {
//     console.error('Error fetching inward data:', error);
//     res.status(500).json({ success: false, message: 'Error fetching inward data' });
//   }
// });



// Endpoint to Fetch All Records

// Route: Fetch inward data for logged-in yard
app.get('/api/inward', async (req, res) => {
  try {
    // 1️⃣ Extract Token from Header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // 2️⃣ Verify Token & Extract Yard Name
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Decoded Token:', decoded); // Debugging
    } catch (error) {
      return res.status(403).json({ message: 'Token verification failed', error: error.message });
    }

    // 3️⃣ Validate if yardname is present
    if (!decoded.yardname) {
      return res.status(400).json({ message: 'Invalid token: No yardname found' });
    }

    console.log('🔍 Searching for yardname:', decoded.yardname); // Debugging

    // 4️⃣ Fetch Data for the Logged-in Yard (Case-Insensitive Search)
    const inwardData = await InwardForm.find({
      yard: { $regex: new RegExp(decoded.yardname, 'i') } // Case-insensitive search
    });

    console.log('📊 Found Data:', inwardData); // Debugging

    // 5️⃣ Send Response
    res.status(200).json({ success: true, data: inwardData });

  } catch (error) {
    console.error('❌ Error fetching inward data:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
});

app.get('/api/statecity-pincode', async (req, res) => {
  try {
    // Fetch all records from the collection
    const data = await StateCityPincode.find({});
    res.status(200).json({
      message: 'Data fetched successfully',
      data: data,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});


app.use('/api', yardRoutes);


// Rate & Payment API
app.get('/api/rates', async (req, res) => {
  try {
    const rates = await Rate_Chart.find(); // Fetch all rate charts
    res.status(200).json(rates); // Respond with the fetched data
  } catch (error) {
    console.error('Error fetching rate charts:', error); // Log the error
    res.status(500).json({ message: 'Error fetching rate charts', error });
  }
});
// POST /api/rates: Add a new rate chart
app.post('/api/rates', async (req, res) => {
  try {
      const { ClientSegment, Rate } = req.body;

      // Validate request data
      if (!ClientSegment || !Rate) {
          return res.status(400).json({ message: 'ClientSegment and Rate are required.' });
      }

      // Create a new Rate_Chart document
      const newRateChart = new Rate_Chart({
          ClientSegment,
          Rate,
      });


      // Save to the database
      const savedRateChart = await newRateChart.save();

      res.status(201).json({
          message: 'Rate chart added successfully!',
          data: savedRateChart,
      });
  } catch (error) {
      console.error('Error adding rate chart:', error);
      res.status(500).json({ message: 'Error adding rate chart', error });
  }
});
      // DELETE /api/rates/:ClientSegment: Delete a rate chart by ClientSegment name
      app.delete('/api/rates/:ClientSegment', async (req, res) => {
        try {
            const { ClientSegment } = req.params;
      
            // Check if ClientSegment exists in the database
            const deletedRateChart = await Rate_Chart.findOneAndDelete({ ClientSegment });
      
            if (!deletedRateChart) {
                return res.status(404).json({
                    message: `Rate chart with ClientSegment '${ClientSegment}' not found.`,
                });
            }
      
            res.status(200).json({
                message: `Rate chart with ClientSegment '${ClientSegment}' deleted successfully!`,
                data: deletedRateChart,
            });
        } catch (error) {
            console.error('Error deleting rate chart:', error);
            res.status(500).json({ message: 'Error deleting rate chart', error });
        }
      });

// Update API
app.put('/api/rates/:id', async (req, res) => {
  const { id } = req.params; // Get the ID from the route parameter
  const { Client_Segment, Rate } = req.body; // Get the fields to update from the request body

  try {
    // Validate request body
    if (!Client_Segment && !Rate) {
      return res.status(400).json({ message: 'Please provide at least one field to update (Client_Segment or Rate).' });
    }

    // Prepare the update object
    const updateFields = {};
    if (Client_Segment !== undefined) {
      updateFields.Client_Segment = Client_Segment;
    }
    if (Rate !== undefined) {
      updateFields.Rate = Rate;
    }

    // Find and update the rate chart
    const updatedRateChart = await Rate_Chart.findByIdAndUpdate(
      id, // Find the document by ID
      updateFields, // Update only the provided fields
      { new: true, runValidators: true } // Return the updated document and run validation
    );

    // If no document is found, return 404
    if (!updatedRateChart) {
      return res.status(404).json({ message: `Rate chart with ID '${id}' not found.` });
    }

    // Return the updated document
    res.status(200).json({
      message: `Rate chart with ID '${id}' updated successfully!`,
      data: updatedRateChart,
    });
  } catch (error) {
    console.error('Error updating rate chart:', error);
    res.status(500).json({ message: 'Error updating rate chart', error });
  }
});

// app.post('/api/calculate-charges', async (req, res) => {
//   try {
//     const { uniqueId, Client_Segment } = req.body;

//     // Validate required inputs
//     if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.trim() === "") {
//       return res.status(400).json({ error: "uniqueId is required and must be a non-empty string." });
//     }
//     if (!Client_Segment || typeof Client_Segment !== 'string' || Client_Segment.trim() === "") {
//       return res.status(400).json({ error: "Client_Segment is required and must be a non-empty string." });
//     }

//     // Fetch car entry using uniqueId
//     const carEntry = await InwardForm.findOne({ uniqueId: uniqueId.trim() });

//     if (!carEntry) {
//       return res.status(404).json({ error: "Car entry not found for the provided uniqueId." });
//     }

//     // Extract details from carEntry
//     const { createdAt, clientName, agreementNumber } = carEntry;

//     // Validate fetched car entry details
//     if (!createdAt || !clientName || !agreementNumber) {
//       return res.status(400).json({ error: "Incomplete data in car entry. Ensure createdAt, clientName, and agreementNumber exist." });
//     }

//     // Log car entry details for debugging
//     console.log("Car Entry Details:", { createdAt, clientName, agreementNumber });

//     // Calculate duration in days based on createdAt
//     const entryDate = moment(createdAt);
//     const currentDate = moment();

//     if (!entryDate.isValid()) {
//       return res.status(400).json({ error: "Invalid date format in car entry." });
//     }

//     const durationDays = currentDate.diff(entryDate, 'days');

//     // Log the received Client_Segment value
//     console.log("Received Client_Segment:", Client_Segment.trim());

//     // Query Rate_Chart for the provided Client_Segment
//     const rateChart = await Rate_Chart.findOne({
//       Client_Segment: { $regex: new RegExp(`^${Client_Segment.trim()}$`, 'i') }
//     });
    
//     console.log("Querying Rate_Chart with Client_Segment:", Client_Segment.trim());
//     console.log("Rate Chart Found:", rateChart);

//     // Handle case where no matching rate chart is found
//     if (!rateChart) {
//       return res.status(404).json({ error: `Rate not found for Client_Segment: ${Client_Segment.trim()}` });
//     }

//     const { Rate } = rateChart;

//     // Convert Rate to a number
//     const numericRate = parseFloat(Rate);

//     // Validate Rate
//     if (isNaN(numericRate) || numericRate <= 0) {
//       return res.status(400).json({ error: `Invalid rate found for Client_Segment: ${Client_Segment.trim()}` });
//     }

//     // Determine duration type and calculate total charge
//     let totalCharge, durationType;

//     if (durationDays <= 30) {
//       totalCharge = durationDays * numericRate;
//       durationType = 'daily';
//     } else if (durationDays <= 365) {
//       const months = Math.ceil(durationDays / 30);
//       totalCharge = months * numericRate;
//       durationType = 'monthly';
//     } else {
//       const years = Math.ceil(durationDays / 365);
//       totalCharge = years * numericRate;
//       durationType = 'yearly';
//     }

//     // Validate total charge
//     if (totalCharge === null || totalCharge === undefined) {
//       return res.status(400).json({ error: "Unable to calculate the total charge. Please check your inputs." });
//     }

//     // Respond with calculated charges
//     return res.json({
//       car_id: carEntry.uniqueId,
//       created_at: createdAt,
//       clientName,
//       agreementNumber,
//       Client_Segment: Client_Segment.trim(),
//       duration_type: durationType,
//       duration_value: durationDays,
//       total_charge: totalCharge,
//     });
//   } catch (error) {
//     console.error("Error calculating charges:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });
// app.post('/api/calculate-charges', async (req, res) => {
//   try {
//     const { uniqueId, Client_Segment } = req.body;

//     // Validate required inputs
//     if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.trim() === "") {
//       return res.status(400).json({ error: "uniqueId is required and must be a non-empty string." });
//     }
//     if (!Client_Segment || typeof Client_Segment !== 'string' || Client_Segment.trim() === "") {
//       return res.status(400).json({ error: "Client_Segment is required and must be a non-empty string." });
//     }

//     // Fetch car entry using uniqueId
//     const carEntry = await InwardForm.findOne({ uniqueId: uniqueId.trim() });

//     if (!carEntry) {
//       return res.status(404).json({ error: "Car entry not found for the provided uniqueId." });
//     }

//     // Extract details from carEntry
//     const { createdAt, clientName, agreementNumber } = carEntry;

//     // Validate fetched car entry details
//     if (!createdAt || !clientName || !agreementNumber) {
//       return res.status(400).json({ error: "Incomplete data in car entry. Ensure createdAt, clientName, and agreementNumber exist." });
//     }

//     // Log car entry details for debugging
//     console.log("Car Entry Details:", { createdAt, clientName, agreementNumber });

//     // Calculate duration in days based on createdAt
//     const entryDate = moment(createdAt);
//     const currentDate = moment();

//     if (!entryDate.isValid()) {
//       return res.status(400).json({ error: "Invalid date format in car entry." });
//     }

//     // Add +1 day to the duration calculation
//     const durationDays = currentDate.diff(entryDate, 'days') + 1;

//     // Log the received Client_Segment value
//     console.log("Received Client_Segment:", Client_Segment.trim());

//     // Query Rate_Chart for the provided Client_Segment
//     const rateChart = await Rate_Chart.findOne({
//       Client_Segment: { $regex: new RegExp(`^${Client_Segment.trim()}$`, 'i') }
//     });
    
//     console.log("Querying Rate_Chart with Client_Segment:", Client_Segment.trim());
//     console.log("Rate Chart Found:", rateChart);

//     // Handle case where no matching rate chart is found
//     if (!rateChart) {
//       return res.status(404).json({ error: `Rate not found for Client_Segment: ${Client_Segment.trim()}` });
//     }

//     const { Rate } = rateChart;

//     // Convert Rate to a number
//     const numericRate = parseFloat(Rate);

//     // Validate Rate
//     if (isNaN(numericRate) || numericRate <= 0) {
//       return res.status(400).json({ error: `Invalid rate found for Client_Segment: ${Client_Segment.trim()}` });
//     }

//     // Determine duration type and calculate total charge
//     let totalCharge, durationType;

//     if (durationDays <= 30) {
//       totalCharge = durationDays * numericRate;
//       durationType = 'daily';
//     } else if (durationDays <= 365) {
//       const months = Math.ceil(durationDays / 30);
//       totalCharge = months * numericRate;
//       durationType = 'monthly';
//     } else {
//       const years = Math.ceil(durationDays / 365);
//       totalCharge = years * numericRate;
//       durationType = 'yearly';
//     }

//     // Validate total charge 
//     if (totalCharge === null || totalCharge === undefined) {
//       return res.status(400).json({ error: "Unable to calculate the total charge. Please check your inputs." });
//     }

//     // Calculate 18% GST
//     const gstAmount = totalCharge * 0.18;
//     const totalChargeWithGST = totalCharge + gstAmount;

//     // Respond with calculated charges
//     return res.json({
//       car_id: carEntry.uniqueId,
//       created_at: createdAt,
//       clientName,
//       agreementNumber,
//       Client_Segment: Client_Segment.trim(),
//       duration_type: durationType,
//       duration_value: durationDays,
//       total_charge: totalCharge,
//       gst_amount: gstAmount,
//       total_charge_with_gst: totalChargeWithGST,
//     });
//   } catch (error) {
//     console.error("Error calculating charges:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });
const calculateCharges = async (uniqueId, Client_Segment) => {
  try {
    // Fetch car entry using uniqueId
    const carEntry = await InwardForm.findOne({ uniqueId: uniqueId.trim() });

    if (!carEntry) {
      throw new Error("Car entry not found for the provided uniqueId.");
    }

    // Extract details from carEntry
    const { createdAt, clientName, agreementNumber } = carEntry;

    if (!createdAt || !clientName || !agreementNumber) {
      throw new Error("Incomplete data in car entry. Ensure createdAt, clientName, and agreementNumber exist.");
    }

    // Calculate duration in days
    const entryDate = moment(createdAt);
    const currentDate = moment();

    if (!entryDate.isValid()) {
      throw new Error("Invalid date format in car entry.");
    }

    const durationDays = currentDate.diff(entryDate, 'days') + 1;

    // Query Rate_Chart for the provided Client_Segment
    const rateChart = await Rate_Chart.findOne({
      Client_Segment: { $regex: new RegExp(`^${Client_Segment.trim()}$`, 'i') }
    });

    if (!rateChart) {
      throw new Error(`Rate not found for Client_Segment: ${Client_Segment.trim()}`);
    }

    const { Rate } = rateChart;
    const numericRate = parseFloat(Rate);

    if (isNaN(numericRate) || numericRate <= 0) {
      throw new Error(`Invalid rate found for Client_Segment: ${Client_Segment.trim()}`);
    }

    // Determine duration type and calculate total charge
    let totalCharge, durationType;
    if (durationDays <= 30) {
      totalCharge = durationDays * numericRate;
      durationType = 'daily';
    } else if (durationDays <= 365) {
      const months = Math.ceil(durationDays / 30);
      totalCharge = months * numericRate;
      durationType = 'monthly';
    } else {
      const years = Math.ceil(durationDays / 365);
      totalCharge = years * numericRate;
      durationType = 'yearly';
    }

    if (totalCharge === null || totalCharge === undefined) {
      throw new Error("Unable to calculate the total charge.");
    }

    // Calculate 18% GST
    const gstAmount = totalCharge * 0.18;
    const totalChargeWithGST = totalCharge + gstAmount;

    return {
      car_id: carEntry.uniqueId,
      created_at: createdAt,
      clientName,
      agreementNumber,
      Client_Segment: Client_Segment.trim(),
      duration_type: durationType,
      duration_value: durationDays,
      total_charge: totalCharge,
      gst_amount: gstAmount,
      total_charge_with_gst: totalChargeWithGST,
    };
  } catch (error) {
    throw new Error(`Charge calculation failed: ${error.message}`);
  }
};

app.post('/api/calculate-charges', async (req, res) => {
  try {
    const { uniqueId, Client_Segment } = req.body;

    if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.trim() === "") {
      return res.status(400).json({ error: "uniqueId is required and must be a non-empty string." });
    }
    if (!Client_Segment || typeof Client_Segment !== 'string' || Client_Segment.trim() === "") {
      return res.status(400).json({ error: "Client_Segment is required and must be a non-empty string." });
    }

    // Call calculateCharges function
    const charges = await calculateCharges(uniqueId, Client_Segment);
    
    return res.json(charges);
  } catch (error) {
    console.error("Error calculating charges:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Create Order Endpoint
app.post('/api/create-order', async (req, res) => {
  try {
      const { uniqueId, Client_Segment } = req.body;

      // Validate required inputs
      if (!uniqueId || !Client_Segment) {
          return res.status(400).json({ error: "uniqueId and Client_Segment are required." });
      }

      // Calculate charges using the helper function
      const charges = await calculateCharges(uniqueId, Client_Segment);
      const amountInPaise = Math.round(charges.total_charge_with_gst * 100);

      // Create Razorpay order
      const orderOptions = {
          amount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_${uniqueId}_${Date.now()}`,
          payment_capture: 1 // Auto-capture payment
      };

      const razorpayOrder = await razorpay.orders.create(orderOptions);

      // Respond with order details
      res.json({
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID // For client-side integration
      });

  } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ error: "Failed to create payment order" });
  }
});


app.post('/api/verify-payment', async (req, res) => {
  try {
      const { order_id, payment_id, razorpay_signature } = req.body;

      // Generate the expected signature
      const body = order_id + "|" + payment_id;
      const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_SECRET)
          .update(body)
          .digest('hex');

      // Validate the signature
      if (expectedSignature !== razorpay_signature) {
          return res.status(400).json({ error: "Invalid payment signature" });
      }

      // Signature is valid - update your database
      // Example: Save payment details to the database
      const paymentDetails = {
          orderId: order_id,
          paymentId: payment_id,
          signature: razorpay_signature,
          status: 'success',
          amount: req.body.amount // Passed from client
      };

      // TODO: Save paymentDetails to your database

      res.json({ 
          status: 'success', 
          message: 'Payment verified successfully' 
      });

  } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Payment verification failed" });
  }
});
// Upload outward photos API

// app.post('/api/outward/:id/photos', upload.fields([
//   { name: 'frontView', maxCount: 1 },
//   { name: 'rightView', maxCount: 1 },
//   { name: 'backView', maxCount: 1 },
//   { name: 'leftView', maxCount: 1 },
//   { name: 'engineView', maxCount: 1 },
//   { name: 'meterReading', maxCount: 1 },
//   { name: 'tyre1', maxCount: 1 },
//   { name: 'tyre2', maxCount: 1 },
//   { name: 'tyre3', maxCount: 1 },
//   { name: 'tyre4', maxCount: 1 },
//   { name: 'tyre5', maxCount: 1 },
//   { name: 'tyre6', maxCount: 1 },
//   { name: 'tyre7', maxCount: 1 },
//   { name: 'tyre8', maxCount: 1 },
//   { name: 'tyre9', maxCount: 1 },
//   { name: 'tyre10', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     const uniqueId = req.params.id;

//     // Step 1: Fetch data from InwardForm
//     const inwardForm = await InwardForm.findOne({ uniqueId: uniqueId });
//     if (!inwardForm) {
//       return res.status(404).json({ message: 'Inward form not found' });
//     }

//     // Step 2: Create new OutwardForm with data from InwardForm
//     const outwardFormData = {
//       uniqueId: uniqueId,
//       clientName: inwardForm.clientName,
//       financeCompanyName: inwardForm.financeCompanyName,
//       agreementNumber: inwardForm.agreementNumber,
//       make: inwardForm.make,
//       model: inwardForm.model,
//       variant: inwardForm.variant,
//       refNo: inwardForm.refNo,
//       segment: inwardForm.segment,
//       loanNo: inwardForm.loanNo,
//       fuelType: inwardForm.fuelType,
//       odometerReading: inwardForm.odometerReading,
//       yard: inwardForm.yard,
//       outwardDateTime: new Date().toISOString(),
//       geoLocation: inwardForm.geoLocation,
//       vehicleDetails: inwardForm.vehicleDetails,
//       checklist: inwardForm.checklist
//   };
  
//   // Create an instance of the model
//   let outwardForm = new OutwardForm(outwardFormData);
  
//   // ✅ Correct way to save
//   await outwardForm.save(); 
  
//     // Helper function to upload to Cloudinary
//     const uploadToCloudinary = async (filePath, fieldName) => {
//       try {
//         const result = await cloudinary.uploader.upload(filePath, {
//           folder: `vehicle_photos/${uniqueId}`,
//           public_id: `${Date.now()}_${fieldName}`,
//           resource_type: 'image',
//         });
//         fs.unlinkSync(filePath); // Remove local file after upload
//         return result.secure_url;
//       } catch (error) {
//         console.error(`Error uploading ${fieldName} to Cloudinary:`, error);
//         throw new Error(`Failed to upload ${fieldName}`);
//       }
//     };

//     // Step 3: Upload files to Cloudinary
//     const uploadedPhotos = {};
//     console.log('Files received:', req.files);

//     const uploadPromises = Object.keys(req.files).map(async (fieldName) => {
//       const file = req.files[fieldName][0];
//       const uploadedUrl = await uploadToCloudinary(file.path, fieldName);
//       uploadedPhotos[fieldName] = uploadedUrl;
//     });

//     await Promise.all(uploadPromises);

//     // Step 4: Update outward form with uploaded URLs
//     outwardForm.vehiclePhotos = {
//       frontView: uploadedPhotos.frontView || null,
//       rightView: uploadedPhotos.rightView || null,
//       backView: uploadedPhotos.backView || null,
//       leftView: uploadedPhotos.leftView || null,
//       engineView: uploadedPhotos.engineView || null,
//       meterReading: uploadedPhotos.meterReading || null
//     };

//     outwardForm.tyrePhotos = {};
//     for (let i = 1; i <= 10; i++) {
//       const tyreField = `tyre${i}`;
//       outwardForm.tyrePhotos[tyreField] = uploadedPhotos[tyreField] || null;
//     }

//     await outwardForm.save();

//     res.status(200).json({
//       message: 'Outward form created and photos uploaded successfully',
//       uniqueId: uniqueId,
//       data: outwardForm,
//     });

//   } catch (err) {
//     console.error('Error details:', err);
//     res.status(500).json({
//       message: 'Error processing outward form',
//       error: err.message,
//     });
//   }
// });

app.post('/api/outward/:id/photos', upload.fields([
  { name: 'frontView', maxCount: 1 },
  { name: 'rightView', maxCount: 1 },
  { name: 'backView', maxCount: 1 },
  { name: 'leftView', maxCount: 1 },
  { name: 'engineView', maxCount: 1 },
  { name: 'meterReading', maxCount: 1 },
  { name: 'tyre1', maxCount: 1 },
  { name: 'tyre2', maxCount: 1 },
  { name: 'tyre3', maxCount: 1 },
  { name: 'tyre4', maxCount: 1 },
  { name: 'tyre5', maxCount: 1 },
  { name: 'tyre6', maxCount: 1 },
  { name: 'tyre7', maxCount: 1 },
  { name: 'tyre8', maxCount: 1 },
  { name: 'tyre9', maxCount: 1 },
  { name: 'tyre10', maxCount: 1 },
  
]), async (req, res) => {
  try {
    const uniqueId = req.params.id;

    // Step 1: Fetch data from InwardForm
    const inwardForm = await InwardForm.findOne({ uniqueId });
    if (!inwardForm) {
      return res.status(404).json({ message: 'Inward form not found' });
    }

    // Step 2: Create new OutwardForm with data from InwardForm
    const outwardFormData = {
      uniqueId,
      clientName: inwardForm.clientName,
      financeCompanyName: inwardForm.financeCompanyName,
      agreementNumber: inwardForm.agreementNumber,
      make: inwardForm.make,
      model: inwardForm.model,
      variant: inwardForm.variant,
      refNo: inwardForm.refNo,
      segment: inwardForm.segment,
      loanNo: inwardForm.loanNo,
      fuelType: inwardForm.fuelType,
      odometerReading: inwardForm.odometerReading,
      yard: inwardForm.yard,
      outwardDateTime: new Date().toISOString(),
      geoLocation: inwardForm.geoLocation,
      vehicleDetails: inwardForm.vehicleDetails,
      checklist: inwardForm.checklist,
      status: "pending" // Default status to pending until admin approves
    };

    let outwardForm = new OutwardForm(outwardFormData);
    await outwardForm.save(); 

    // Helper function to upload to Cloudinary
    const uploadToCloudinary = async (filePath, fieldName) => {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: `vehicle_photos/${uniqueId}`,
          public_id: `${Date.now()}_${fieldName}`,
          resource_type: 'image',
        });
        fs.unlinkSync(filePath); // Remove local file after upload
        return result.secure_url;
      } catch (error) {
        console.error(`Error uploading ${fieldName} to Cloudinary:`, error);
        throw new Error(`Failed to upload ${fieldName}`);
      }
    };

    // Step 3: Upload files to Cloudinary
    const uploadedPhotos = {};
    console.log('Files received:', req.files);

    const uploadPromises = Object.keys(req.files).map(async (fieldName) => {
      const file = req.files[fieldName][0];
      uploadedPhotos[fieldName] = await uploadToCloudinary(file.path, fieldName);
    });

    await Promise.all(uploadPromises);

    // Step 4: Update outward form with uploaded URLs
    outwardForm.vehiclePhotos = {
      frontView: uploadedPhotos.frontView || null,
      rightView: uploadedPhotos.rightView || null,
      backView: uploadedPhotos.backView || null,
      leftView: uploadedPhotos.leftView || null,
      engineView: uploadedPhotos.engineView || null,
      meterReading: uploadedPhotos.meterReading || null
    };

    outwardForm.tyrePhotos = {};
    for (let i = 1; i <= 10; i++) {
      const tyreField = `tyre${i}`;
      outwardForm.tyrePhotos[tyreField] = uploadedPhotos[tyreField] || null;
    }

    await outwardForm.save();

    res.status(200).json({
      message: 'Outward form created and photos uploaded successfully',
      uniqueId,
      data: outwardForm,
    });

  } catch (err) {
    console.error('Error details:', err); 
    res.status(500).json({
      message: 'Error processing outward form',
      error: err.message,
    });
  }
});

app.post('/api/admin/approval', async (req, res) => {
  try {
    const { uniqueId, decision } = req.body;
    const outwardForm = await OutwardForm.findOne({ uniqueId });

    if (!outwardForm) {
      return res.status(404).json({ message: 'Outward form not found' });
    }

    if (decision === "approve") {
      outwardForm.status = "approved";
      outwardForm.releaseDateTime = new Date().toISOString();
      await outwardForm.save();
      return res.status(200).json({ message: 'Outward form approved.' });
    }

    if (decision === "reject") {
      outwardForm.status = "rejected";
      outwardForm.queueStatus = "pending"; // ✅ Move to queue for future review
      await outwardForm.save();
      return res.status(200).json({ message: 'Outward form rejected and moved to queue.', redirect: '/queue-page' });
    }

    return res.status(400).json({ message: 'Invalid decision' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error processing approval', error: error.message });
  }
});


//outwardForm fetching for outward_vehicle_list
// API endpoint to fetch outward forms

// Get all outward forms
app.get('/api/outward-form', async (req, res) => {
  try {
      const forms = await OutwardForm.find();
      res.status(200).json(forms);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching outward forms', error: error.message });
  }
});



// Fetch outward form by uniqueId instead of _id
app.get('/api/outward-form/:uniqueId', async (req, res) => {
  try {
      const form = await OutwardForm.findOne({ uniqueId: req.params.uniqueId });
      if (!form) {
          return res.status(404).json({ message: 'Outward form not found' });
      }
      res.status(200).json(form);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching outward form', error: error.message });
  }
});


// Delete an outward form by ID
app.delete('/api/outward-form/:uniqueId', async (req, res) => {
  try {
      const deletedForm = await OutwardForm.findOneAndDelete({ uniqueId: req.params.uniqueId });
      if (!deletedForm) {
          return res.status(404).json({ message: 'Outward form not found' });
      }
      res.status(200).json({ message: 'Outward form deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: 'Error deleting outward form', error: error.message });
  }
});
// API'S FOR ADMIN YardOwenr 

app.get('/api/outward-entries', async (req, res) => {
  try {
      const { yard } = req.query;

      if (!yard) {
          return res.status(400).json({ message: 'Yard name is required' });
      }

      // Fetch outward entries filtered by the yard field
      const outwardEntries = await OutwardForm.find({ yard });

      if (outwardEntries.length === 0) {
          return res.status(404).json({ message: 'No outward entries found for this yard' });
      }

      res.status(200).json(outwardEntries);
  } catch (error) {
      console.error('Error fetching outward entries:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/api/inward-entries', async (req, res) => {
  try {
      console.log('Received Query:', req.query);
      const { yard } = req.query;

      if (!yard) {
          return res.status(400).json({ message: 'Yard name is required' });
      }

      const trimmedYard = yard.trim();
      console.log('Searching for yard:', trimmedYard);

      const inwardEntries = await InwardForm.find({
          yard: { $regex: new RegExp(trimmedYard.replace(/\s+/g, '\\s*'), 'i') }
      });

      if (inwardEntries.length === 0) {
          console.log('No inward entries found for:', trimmedYard);
          return res.status(404).json({ message: 'No inward entries found for this yard' });
      }

      res.status(200).json(inwardEntries);
  } catch (error) {
      console.error('Error fetching inward entries:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});
// API to fetch all yard owners

app.get('/api/yardowners', async (req, res) => {
  try {
    const inwardEntries = await InwardForm.find({}); // Fetch all inward entries
    res.status(200).json(inwardEntries);
  } catch (error) {
    console.error('Error fetching inward entries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// API to fetch all yard owners

app.get('/api/yardowners', async (req, res) => {
  try {
    const inwardEntries = await InwardForm.find({}); // Fetch all inward entries
    res.status(200).json(inwardEntries);
  } catch (error) {
    console.error('Error fetching inward entries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// New Authentication routes for Forgot Password, etc.
app.use('/api/auth', require('./routes/auth'));

// New Activity (History) routes
app.use('/api/activity', require('./routes/activity'));


// Import routes (ensure your routes file is also converted to ES module syntax)

// app.use('/api/history', historyRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    
});


