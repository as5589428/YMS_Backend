// server.js
const express = require('express');
const fs = require('fs');
const moment = require('moment');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const multer = require('multer');
const User = require('./models/User');
const YardOwner = require('./models/YardOwner');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const FinanceEmployee = require('./models/FinanceEmployee');
const InwardForm = require('./models/InwardForm');
const makeModelDataset = require('./models/makeModelVariant');  // Import the route
// const StateCityPincode = require('./models/StateCityPincode');
const cloudinary = require('cloudinary').v2;
const yardRoutes = require('./routes/yardRoutes');
// const makeModelDataset = require('./models/makeModelDataset'); // Import your model

const path = require('path');
const StateCityPincode = require('./models/StateCityPincode');
const Rate_Chart = require('./models/Rate_Chart');
const OutwardForm = require('./models/OutwardForm');
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

app.post('/register', async (req, res) => {
    const { name, userid, password, address, pincode } = req.body;

    if (!userid) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ userid });
    if (existingUser) {
        return res.status(400).json({ message: 'User ID already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const user = new User({
        name,
        userid,
        password: hashedPassword, // Save the hashed password
        address,
        pincode,
    });

    try {
        await user.save();
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
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
app.get('/profile', async (req, res) => {
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
router.post('/yardowner/register', upload.single('photo'), async (req, res) => {
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
        // Check if YardOwner exists
        const yardOwner = await YardOwner.findOne({ yardname });
        if (!yardOwner) return res.status(400).json({ message: 'Invalid credentials' });

        // Compare password
        const isMatch = await bcrypt.compare(password, yardOwner.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate JWT Token
        const token = jwt.sign({ id: yardOwner._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});





// Finance Login & Regiser 


// Finance Login & Regiser 


app.post('/finance/register', async (req, res) => {
  const { empCode, name, email, aadharnumber, designation, whatsapp, mobile, companyName, password } = req.body;

  // Validate that all required fields are provided
  if (!empCode || !name ||!email ||!aadharnumber || !designation || !whatsapp || !mobile || !companyName || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
      // Check if the username already exists
     // const existingUser = await FinanceEmployee.findOne({ username });
      //if (existingUser) {
        //  return res.status(400).json({ message: 'Username already exists' });
      //}

      // Check if the employee code already exists
      const existingEmpCode = await FinanceEmployee.findOne({ empCode });
      if (existingEmpCode) {
          return res.status(400).json({ message: 'Employee Code already exists' });
      }

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
          //username,
          password: hashedPassword // Save the hashed password
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
    const financeEmployee = await FinanceEmployee.findOne({ empCode });

    if (!financeEmployee) {
        return res.status(404).json({ message: 'Finance Employee not found' });
    }

    // Send the profile data as a JSON response
    res.status(200).json(financeEmployee);
} catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
}
});
// Route to create a new gate pass
// Updated route without photo handling
app.post('/finance/gatepass', async (req, res) => {
  const { name, aadharNumber, mobileNumber, vehicleNumber } = req.body;

  try {
      const newGatePass = new GatePass({
          name,
          aadharNumber,
          mobileNumber,
          vehicleNumber,
      });

      await newGatePass.save();
      res.status(201).json({ message: 'Gate pass created successfully.', data: newGatePass });
  } catch (error) {
      console.error('Error creating gate pass:', error);
      res.status(500).json({ message: 'Error creating gate pass', error: error.message });
  }
});


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

// Route to get all gate passes (optional, for admin view)
app.get('/finance/gatepass', async (req, res) => {
  try {
    const gatePasses = await GatePass.find();
    res.status(200).json(gatePasses);
  } catch (error) {
    console.error('Error retrieving gate passes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//Finance Stockmanagement 

app.post('/finance/stock', async (req, res) => {
  const { financecompanyname } = req.body; // Extracts financecompanyname from the request body

  if (!financecompanyname) {
    return res.status(400).json({ message: 'Finance company name is required' });
  }

  try {
    // Case-insensitive query to find documents where financecompanyname matches
    const vehicles = await InwardForm.find({
      financecompanyname: { $regex: new RegExp('^' + financecompanyname + '$', 'i') }
    });

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found for the given company' });
    }

    // Process data (e.g., count, group by segments, etc.)
    const totalVehicles = vehicles.length;

    const segments = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.segment] = (acc[vehicle.segment] || 0) + 1;
      return acc;
    }, {});

    const yards = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.yard]) acc[vehicle.yard] = {};
      acc[vehicle.yard][vehicle.segment] = (acc[vehicle.yard][vehicle.segment] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      totalVehicles,
      segments,
      yards,
    });
  } catch (error) {
    console.error('Error fetching vehicle data:', error);
    res.status(500).json({ message: 'Error fetching vehicle data' });
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




// app.post('/api/inward', async (req, res) => {
//   try {
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
app.post('/api/inward', upload.single('vahan_image'), async (req, res) => {
  try {
    // Generate a unique ID
    const uniqueId = await generateUniqueID();

    // Validate required fields
    if (!req.body.clientName || !req.body.agreementNumber) {
      return res.status(400).json({ message: 'Client Name and Agreement Number are required' });
    }

    // Upload the `vahan_image` to Cloudinary
    let vahanImageUrl = null;
    if (req.file) {
      // Upload the image to Cloudinary and save the URL
      vahanImageUrl = await uploadToCloudinary(req.file.path, 'vahan-image'); // Specify the folder name here
    }

    console.log('Uploaded File:', req.file);

    // Create the inward form data
    const inwardData = new InwardForm({
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
      vahanImage: vahanImageUrl, // Save the Cloudinary URL
    });

    // Save the inward form data to the database
    const savedInward = await inwardData.save();
    res.status(201).json({
      message: 'Inward form data saved successfully',
      data: savedInward,
    });
  } catch (err) {
    console.error('Error processing inward form data:', err);
    res.status(500).json({
      message: 'Error processing inward form data',
      error: err.message,
    });
  }
});

// app.post('/api/inward/:id/photos', upload.fields([
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
//     // Check what files were received
//     const uniqueId = req.params.id; // Get uniqueId from the URL parameter
 
    
//     // Validate the uniqueId format (you can add a custom validation for your specific format if needed)
//     if (!uniqueId) {
     
//       return res.status(400).json({ message: 'Unique ID is required' });
 
//     }

//     // Find the inward form by uniqueId
//     const inwardForm = await InwardForm.findOne({ uniqueId: uniqueId });

//     if (!inwardForm) {
//       return res.status(404).json({ message: 'Inward form not found or incomplete. Please make sure the form is created correctly.' });

//     }

 
    
//     const uploadToCloudinary = (filePath, fieldName, folderType = 'vehicle_photos', yardname = null) => {
//       try {
//         // Validate inputs
//         if (!folderType) {
//           throw new Error('Folder type is required and cannot be undefined.');
//         }
    
//         // Determine the folder path based on the type
//         let folderPath;
//         switch (folderType) {
//           case 'vehicle_photos':
//             const uniqueId = Date.now();
//             folderPath = `vehicle_photos/${uniqueId}`;
//             break;
    
//           case 'yard-owner-profile':
//             if (!yardname) {
//               throw new Error('Yardname is required for yard-owner-profile uploads');
//             }
//             folderPath = `yard-owner-profile/${yardname}`;
//             break;
    
//           default:
//             throw new Error(`Invalid folder type specified: ${folderType}`);
//         }
    
//         // Upload to Cloudinary
//         return cloudinary.uploader.upload(filePath, {
//           folder: folderPath,
//           public_id: `${Date.now()}_${fieldName}`,
//           resource_type: 'image',
//         })
//           .then(result => {
//             const uploadedUrl = result.secure_url;
//             fs.unlinkSync(filePath); // Remove local file
//             return uploadedUrl;
//           })
//           .catch(error => {
//             console.error(`Error uploading ${fieldName} to Cloudinary:`, error);
//             throw new Error(`Failed to upload ${fieldName}. Please try again.`);
//           });
    
//       } catch (error) {
//         console.error('Error in uploadToCloudinary:', error.message);
//         throw error;
//       }
//     };
//     const uploadedPhotos = {}; 
//     // Step 3: Upload files to Cloudinary
//     console.log('Files received:', req.files);
//     const uploadPromises = Object.keys(req.files).map(fieldName => {
//       const file = req.files[fieldName][0];
//       return uploadToCloudinary(file.path, fieldName);
//     });

//     // Wait for all files to be uploaded
//     await Promise.all(uploadPromises);

//     // Step 4: Update inward form with the uploaded photo URLs
//     inwardForm.vehiclePhotos = {
//       frontView: uploadedPhotos.frontView || null,
//       rightView: uploadedPhotos.rightView || null,
//       backView: uploadedPhotos.backView || null,
//       leftView: uploadedPhotos.leftView || null,
//       engineView: uploadedPhotos.engineView || null,
//       meterReading: uploadedPhotos.meterReading || null
//     };

//     inwardForm.tyrePhotos = {};
//     for (let i = 1; i <= 10; i++) {
//       const tyreField = `tyre${i}`;
//       inwardForm.tyrePhotos[tyreField] = uploadedPhotos[tyreField] || null;
//     }

//     // Step 5: Save the updated inward form
//     const updatedInward = await inwardForm.save();
//     res.status(200).json({
//       message: 'Photos uploaded successfully',
//       uniqueId: uniqueId,
//       data: updatedInward
//     });

//   } catch (err) {
//     console.log('Error details:', err);
//     res.status(400).json({
//       message: 'Error uploading photos',
//       error: err.message
//     });
//   }
// });





// OUTWARD API - ABDUL

// Outward API
// Outward API Route

// Defining a route to fetch inward data
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
  { name: 'tyre10', maxCount: 1 }
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
app.get('/api/inward/:uniqueId', async (req, res) => {
  const { uniqueId } = req.params;

  console.log('Received request for uniqueId:', uniqueId);  // Log to check route access

  try {
    // Ensure uniqueId is treated as a number (since MongoDB stores it as a number)
    const numericUniqueId = Number(uniqueId);

    // Validate that the uniqueId is a valid number
    if (isNaN(numericUniqueId)) {
      console.log('Invalid Unique ID format: Not a valid number');
      return res.status(400).json({ message: 'Invalid Unique ID format' });
    }

    // Query the InwardForm collection for the uniqueId
    const inwardForm = await InwardForm.findOne({ uniqueId: numericUniqueId });

    // Check if the form exists
    if (!inwardForm) {
      console.log('No InwardForm found for uniqueId:', numericUniqueId);
      return res.status(404).json({ message: `No Inward form found for Unique ID: ${numericUniqueId}` });
    }

    // Return the found InwardForm
    res.status(200).json({
      message: 'Inward form retrieved successfully',
      data: inwardForm,
    });

  } catch (err) {
    console.error(`Error fetching InwardForm for Unique ID: ${uniqueId}`, err);

    res.status(500).json({
      message: 'Internal Server Error while fetching the Inward form',
      error: err.message,
    });
  }
});

app.get('/api/inward', async (req, res) => {
  try {
    // Fetch all records from the InwardForm collection
    const inwardForms = await InwardForm.find();

    // Check if there are any records
    if (!inwardForms || inwardForms.length === 0) {
      console.log('No InwardForms found');
      return res.status(404).json({ message: 'No Inward forms found' });
    }

    // Return the list of InwardForms
    res.status(200).json({
      message: 'Inward forms retrieved successfully',
      data: inwardForms,
    });
  } catch (err) {
    console.error('Error fetching all InwardForms', err);

    res.status(500).json({
      message: 'Internal Server Error while fetching the Inward forms',
      error: err.message,
    });
  }
});

// Endpoint to Fetch All Records
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

      // PUT /api/rates/:id - Update a rate chart by ID
app.put('/api/rates/:id', async (req, res) => {
  const { id } = req.params; // Get the ID from the route parameter
  const { ClientSegment, Rate } = req.body; // Get the fields to update from the request body

  try {
      // Validate request body
      if (!ClientSegment && !Rate) {
          return res.status(400).json({ message: 'Please provide at least one field to update (ClientSegment or Rate).' });
      }

      // Find and update the rate chart
      const updatedRateChart = await Rate_Chart.findByIdAndUpdate(
          id, // Find the document by ID
          { ...(ClientSegment && { ClientSegment }), ...(Rate && { Rate }) }, // Update only the provided fields
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
// POST /api/calculate-charges
app.post('/api/calculate-charges', async (req, res) => {
  try {
    const { uniqueId, Client_Segment } = req.body;

    // Validate required inputs
    if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.trim() === "") {
      return res.status(400).json({ error: "uniqueId is required and must be a non-empty string." });
    }
    if (!Client_Segment || typeof Client_Segment !== 'string' || Client_Segment.trim() === "") {
      return res.status(400).json({ error: "Client_Segment is required and must be a non-empty string." });
    }

    // Fetch car entry using uniqueId
    const carEntry = await InwardForm.findOne({ uniqueId: uniqueId.trim() });

    if (!carEntry) {
      return res.status(404).json({ error: "Car entry not found for the provided uniqueId." });
    }

    // Extract details from carEntry
    const { createdAt, clientName, agreementNumber } = carEntry;

    // Validate fetched car entry details
    if (!createdAt || !clientName || !agreementNumber) {
      return res.status(400).json({ error: "Incomplete data in car entry. Ensure createdAt, clientName, and agreementNumber exist." });
    }

    // Log car entry details for debugging
    console.log("Car Entry Details:", { createdAt, clientName, agreementNumber });

    // Calculate duration in days based on createdAt
    const entryDate = moment(createdAt);
    const currentDate = moment();

    if (!entryDate.isValid()) {
      return res.status(400).json({ error: "Invalid date format in car entry." });
    }

    const durationDays = currentDate.diff(entryDate, 'days');

    // Log the received Client_Segment value
    console.log("Received Client_Segment:", Client_Segment.trim());

    // Query Rate_Chart for the provided Client_Segment
    const rateChart = await Rate_Chart.findOne({
      Client_Segment: { $regex: new RegExp(`^${Client_Segment.trim()}$`, 'i') }
    });
    
    console.log("Querying Rate_Chart with Client_Segment:", Client_Segment.trim());
    console.log("Rate Chart Found:", rateChart);

    // Handle case where no matching rate chart is found
    if (!rateChart) {
      return res.status(404).json({ error: `Rate not found for Client_Segment: ${Client_Segment.trim()}` });
    }

    const { Rate } = rateChart;

    // Convert Rate to a number
    const numericRate = parseFloat(Rate);

    // Validate Rate
    if (isNaN(numericRate) || numericRate <= 0) {
      return res.status(400).json({ error: `Invalid rate found for Client_Segment: ${Client_Segment.trim()}` });
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

    // Validate total charge
    if (totalCharge === null || totalCharge === undefined) {
      return res.status(400).json({ error: "Unable to calculate the total charge. Please check your inputs." });
    }

    // Respond with calculated charges
    return res.json({
      car_id: carEntry.uniqueId,
      created_at: createdAt,
      clientName,
      agreementNumber,
      Client_Segment: Client_Segment.trim(),
      duration_type: durationType,
      duration_value: durationDays,
      total_charge: totalCharge,
    });
  } catch (error) {
    console.error("Error calculating charges:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Upload outward photos API

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
  { name: 'tyre10', maxCount: 1 }
]), async (req, res) => {
  try {
    const uniqueId = req.params.id;

    // Step 1: Fetch data from InwardForm
    const inwardForm = await InwardForm.findOne({ uniqueId: uniqueId });
    if (!inwardForm) {
      return res.status(404).json({ message: 'Inward form not found' });
    }

    // Step 2: Create new OutwardForm with data from InwardForm
    const outwardFormData = {
      uniqueId: uniqueId,
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
      checklist: inwardForm.checklist
  };
  
  // Create an instance of the model
  let outwardForm = new OutwardForm(outwardFormData);
  
  // ✅ Correct way to save
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
      const uploadedUrl = await uploadToCloudinary(file.path, fieldName);
      uploadedPhotos[fieldName] = uploadedUrl;
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
      uniqueId: uniqueId,
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


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });