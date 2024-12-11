// server.js
const express = require('express');
const fs = require('fs');

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
// const makeModelDataset = require('./models/makeModelDataset'); // Import your model

const path = require('path');
const StateCityPincode = require('./models/StateCityPincode');
dotenv.config();

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
// API route to receive and upload photos
// app.post('/api/inward/:id/photos', upload.fields([
//   { name: 'frontView', maxCount: 1 },
//   { name: 'rightView', maxCount: 1 },
//   { name: 'backView', maxCount: 1 },
//   { name: 'leftView', maxCount: 1 },
//   { name: 'engineView', maxCount: 1 },
//   { name: 'meterReading', maxCount: 1 },
//   // Add tyre fields (tyre1 to tyre10)
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
//     const uploadedPhotos = {}; // Object to store the Cloudinary URLs for each view

//     // Helper function to upload a file to Cloudinary and store the URL
//     const uploadToCloudinary = (filePath, publicId) => {
//       return cloudinary.uploader.upload(filePath, {
//         folder: "vehicle_photos",
//         public_id: publicId // Set Cloudinary public_id as the view name
//       })
//       .then(result => {
//         uploadedPhotos[publicId] = result.secure_url;
//         fs.unlinkSync(filePath); // Remove the temporary file
//       })
//       .catch(error => {
//         console.error(`Error uploading ${publicId} to Cloudinary:`, error);
//       });
//     };

//     // Create an array of promises for each file to be uploaded
//     const uploadPromises = Object.keys(req.files).map(fieldName => {
//       const file = req.files[fieldName][0];
//       return uploadToCloudinary(file.path, fieldName);
//     });

//     // Upload all the files to Cloudinary
//     await Promise.all(uploadPromises);

//     res.status(200).json({
//       message: 'Photos uploaded successfully',
//       vehiclePhotos: uploadedPhotos
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Error uploading photos', error: error.message });
//   }
// });

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

// YardOwner Login endpoint
app.post('/yardowner/register', async (req, res) => {
    const { yardname, contact_person, state, district, city, pincode, phone, email, address, password } = req.body;

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
    });

    try {
        await yardOwner.save();
        res.status(201).json({ message: 'YardOwner registered successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error registering YardOwner: ' + error.message });
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




//Inward From

// app.post('/api/inward', async (req, res) => {
//     try {
//       const inwardData = new InwardForm({
//         clientName: req.body.clientName,
//         agreementNumber: req.body.agreementNumber,
//         make: req.body.make,
//         model: req.body.model,
//         variant: req.body.variant,
//         refNo: req.body.refNo,
//         segment: req.body.segment,
//         geoLocation: req.body.geoLocation,
//         inwardDateTime: req.body.inwardDateTime,
//       });
  
//       const savedInward = await inwardData.save();
//       res.status(201).json({
//         message: 'Inward form data saved successfully',
//         data: savedInward,
//       });
//     } catch (err) {
//       res.status(400).json({
//         message: 'Error saving inward form data',
//         error: err.message,
//       });
//     }
//   });

// Multer setup for file uploads
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//       cb(null, `${Date.now()}-${file.originalname}`);
//     }
//   });
//   const upload = multer({ storage });


//   API END POINT FOR INWARD FORMS
// app.post('/api/inward', async (req, res) => {
//     try {
//       const inwardData = new InwardForm({
//         clientName: req.body.clientName,
//         agreementNumber: req.body.agreementNumber,
//         make: req.body.make,
//         model: req.body.model,
//         variant: req.body.variant,
//         refNo: req.body.refNo,
//         segment: req.body.segment,
//         loanNo: req.body.loanNo,               // New field added
//         fuelType: req.body.fuelType,           // New field added
//         odometerReading: req.body.odometerReading, // New field added
//         yard: req.body.yard, 
//         inwardDateTime: req.body.inwardDateTime,                 // New field added
//         geoLocation: req.body.geoLocation,
     
//         vehicleDetails: {
//           customerName: req.body.vehicleDetails.customerName,
//           engineNumber: req.body.vehicleDetails.engineNumber,
//           chassisNumber: req.body.vehicleDetails.chassisNumber,
//           color: req.body.vehicleDetails.color,
//           vehicleClass: req.body.vehicleDetails.vehicleClass,
//           vehicleCondition: req.body.vehicleDetails.vehicleCondition,
//           keyLocation: req.body.vehicleDetails.keyLocation,
//           transmission: req.body.vehicleDetails.transmission,
//           remarks: req.body.vehicleDetails.remarks,
          
//         },
//         checklist: req.body.checklist // assuming checklist is an array of objects sent in the correct format
//       });
  
//       const savedInward = await inwardData.save();
//       res.status(201).json({
//         message: 'Inward form data saved successfully',
//         data: savedInward,
//       });
//     } catch (err) {
//       res.status(400).json({
//         message: 'Error saving inward form data',
//         error: err.message,
//       });
//     }
//   });16-11-24


app.post('/api/inward', async (req, res) => {
  try {
    // Generate a unique 4-5 digit ID
    const uniqueId = await generateUniqueID(); // Ensure generateUniqueID() is a valid async function

    // Validate required fields before proceeding
    if (!req.body.clientName || !req.body.agreementNumberc ) {
      return res.status(400).json({ message: 'Client Name and Agreement Number are required' });
    }

    // Create the inward form data
    const inwardData = new InwardForm({
      uniqueId, // Add the generated unique ID here
      
      clientName: req.body.clientName,
      agreementNumber: req.body.agreementNumber,
      make: req.body.make,
      model: req.body.model,
      variant: req.body.variant,
      refNo: req.body.refNo,
      segment: req.body.segment,
      loanNo: req.body.loanNo,
      fuelType: req.body.fuelType,
      odometerReading: req.body.odometerReading,
      yard: req.body.yard,
      inwardDateTime: req.body.inwardDateTime,
      geoLocation: req.body.geoLocation,

      // Safely access nested vehicle details
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

      // Assuming checklist is an array of objects, make sure it is properly handled
      checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
    });

    // Save the inward form data to the database
    const savedInward = await inwardData.save();
    res.status(201).json({
      message: 'Inward form data saved successfully',
      data: savedInward,
    });
  } catch (err) {
    // Improved error logging for better debugging
    console.error('Error saving inward form data:', err);
    res.status(400).json({
      message: 'Error saving inward form data',
      error: err.message,
    });
  }
});

//   // Route to upload vehicle photos
// app.post('/api/inward/:id/photos', upload.fields([
//     { name: 'frontView', maxCount: 1 },
//     { name: 'rightView', maxCount: 1 },
//     { name: 'backView', maxCount: 1 },
//     { name: 'leftView', maxCount: 1 },
//     { name: 'engineView', maxCount: 1 },
//     { name: 'meterReading', maxCount: 1 }
//   ]), async (req, res) => {
//     try {
//       const inwardForm = await InwardForm.findById(req.params.id);
//       if (!inwardForm) {
//         return res.status(404).json({ message: 'Inward form not found' });
//       }
  
//       // Update photo URLs in vehiclePhotos field
//       inwardForm.vehiclePhotos.frontView = req.files.frontView ? req.files.frontView[0].path : null;
//       inwardForm.vehiclePhotos.rightView = req.files.rightView ? req.files.rightView[0].path : null;
//       inwardForm.vehiclePhotos.backView = req.files.backView ? req.files.backView[0].path : null;
//       inwardForm.vehiclePhotos.leftView = req.files.leftView ? req.files.leftView[0].path : null;
//       inwardForm.vehiclePhotos.engineView = req.files.engineView ? req.files.engineView[0].path : null;
//       inwardForm.vehiclePhotos.meterReading = req.files.meterReading ? req.files.meterReading[0].path : null;
  
//       const updatedInward = await inwardForm.save();
//       res.status(200).json({ message: 'Photos uploaded successfully', data: updatedInward });
//     } catch (err) {
//       res.status(400).json({ message: 'Error uploading photos', error: err.message });
//     }
//   });
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
//       const id = req.params.id;

//       // Validate ObjectId format
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//           return res.status(400).json({ message: 'Invalid ID format' });
//       }

//       // Find the document by id
//       const inwardForm = await InwardForm.findById(id);
//       if (!inwardForm) {
//           return res.status(404).json({ message: 'Inward form not found' });
//       }

//       // Update photo URLs in vehiclePhotos field
//       inwardForm.vehiclePhotos.frontView = req.files.frontView ? req.files.frontView[0].path : null;
//       inwardForm.vehiclePhotos.rightView = req.files.rightView ? req.files.rightView[0].path : null;
//       inwardForm.vehiclePhotos.backView = req.files.backView ? req.files.backView[0].path : null;
//       inwardForm.vehiclePhotos.leftView = req.files.leftView ? req.files.leftView[0].path : null;
//       inwardForm.vehiclePhotos.engineView = req.files.engineView ? req.files.engineView[0].path : null;
//       inwardForm.vehiclePhotos.meterReading = req.files.meterReading ? req.files.meterReading[0].path : null;

//       // Update tire photos based on the number of fields present in the request
//       inwardForm.tyrePhotos = {};
//       for (let i = 1; i <= 10; i++) {
//           const tyreField = `tyre${i}`;
//           inwardForm.tyrePhotos[tyreField] = req.files[tyreField] ? req.files[tyreField][0].path : null;
//       }

//       const updatedInward = await inwardForm.save();
//       res.status(200).json({ message: 'Photos uploaded successfully', data: updatedInward });
//   } catch (err) {
//     console.log('Model instance:', inwardForm);

//       res.status(400).json({ message: 'Error uploading photos', error: err.message });
//   }
// });16/11/24

app.post('/api/inward/:id/photos', upload.fields([
  { name: 'Front View', maxCount: 1 },
  { name: 'Right View', maxCount: 1 },
  { name: 'Back View', maxCount: 1 },
  { name: 'Left View', maxCount: 1 },
  { name: 'Engine View', maxCount: 1 },
  { name: 'Meter Reading', maxCount: 1 },
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
    // Check what files were received
    const uniqueId = req.params.id; // Get uniqueId from the URL parameter

    // Validate the uniqueId format (you can add a custom validation for your specific format if needed)
    if (!uniqueId) {
     
      return res.status(400).json({ message: 'Unique ID is required' });
 
    }

    // Find the inward form by uniqueId
    const inwardForm = await InwardForm.findOne({ uniqueId: uniqueId });

    if (!inwardForm) {
      return res.status(404).json({ message: 'Inward form not found or incomplete. Please make sure the form is created correctly.' });

    }

    const uploadedPhotos = {}; // Object to store the Cloudinary URLs for each view

    // Helper function to upload a file to Cloudinary and store the URL
    const uploadToCloudinary = (filePath, publicId) => {
      return cloudinary.uploader.upload(filePath, {
        folder: "vehicle_photos",
        public_id: publicId // Set Cloudinary public_id as the view name
      })
      .then(result => {
        uploadedPhotos[publicId] = result.secure_url;
        fs.unlinkSync(filePath); // Remove the temporary file
      })
      .catch(error => {
        console.error(`Error uploading ${publicId} to Cloudinary:`, error);
  
      });
    };

    // Create an array of promises for each file to be uploaded
    const uploadPromises = Object.keys(req.files).map(fieldName => {
      const file = req.files[fieldName][0];
      return uploadToCloudinary(file.path, fieldName);
      console.log(req.files); 
    });
  

    // Upload all the files to Cloudinary
    await Promise.all(uploadPromises);

    // Update photo URLs in the inward form with Cloudinary URLs
    inwardForm.vehiclePhotos.frontView = uploadedPhotos.frontView || null;
    inwardForm.vehiclePhotos.rightView = uploadedPhotos.rightView || null;
    inwardForm.vehiclePhotos.backView = uploadedPhotos.backView || null;
    inwardForm.vehiclePhotos.leftView = uploadedPhotos.leftView || null;
    inwardForm.vehiclePhotos.engineView = uploadedPhotos.engineView || null;
    inwardForm.vehiclePhotos.meterReading = uploadedPhotos.meterReading || null;

    // Update tire photos based on the number of fields present in the request
    inwardForm.tyrePhotos = {};
    for (let i = 1; i <= 10; i++) {
      const tyreField = `tyre${i}`;
      inwardForm.tyrePhotos[tyreField] = uploadedPhotos[tyreField] || null;
    }
    console.log(req.files); 
    // Save the updated inward form with Cloudinary photo URLs
    const updatedInward = await inwardForm.save();
    res.status(200).json({ message: 'Photos uploaded successfully', data: updatedInward });

  } catch (err) {
    console.log('Error details:', err);
    res.status(400).json({ message: 'Error uploading photos', error: err.message });
  }
});

// API route to fetch details by unique ID
app.get('/inwardform/:uniqueId', async (req, res) => {
  const { uniqueId } = req.params;

  try {
    // Search for the document by uniqueId
    const inwardForm = await InwardForm.findOne({ uniqueId });

    if (!inwardForm) {
      return res.status(404).json({ message: 'Inward form not found' });
    }

    // If found, return the data
    return res.status(200).json(inwardForm);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});