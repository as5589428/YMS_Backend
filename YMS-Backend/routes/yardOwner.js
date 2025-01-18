const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const YardOwner = require('../models/YardOwner');
const router = express.Router();
require('dotenv').config();

// YardOwner Registration
router.post('/register', async (req, res) => {
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
    let owner = await YardOwner.findOne({ yardname });
    if (owner) {
      return res.status(400).json({ msg: 'Yard name already exists' });
    }

    owner = await YardOwner.findOne({ email });
    if (owner) {
      return res.status(400).json({ msg: 'Email already exists' });
    }

    // Create a new YardOwner
    owner = new YardOwner({
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
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    owner.password = await bcrypt.hash(password, salt);

    // Save to DB
    await owner.save();

    // Return JWT token
    const payload = {
      owner: {
        id: owner.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// YardOwner Login
router.post('/login', async (req, res) => {
  const { yardname, password } = req.body;

  try {
    // Check if yardname exists
    const owner = await YardOwner.findOne({ yardname });
    if (!owner) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Return JWT token
    const payload = {
      owner: {
        id: owner.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
