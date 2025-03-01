const express = require('express');
const jwt = require('jsonwebtoken');
const YardOwners = require('../models/YardOwner');

const router = express.Router();

// Middleware to Verify JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token is missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        req.user = user; // Extract user info from token
        next();
    });
};

// Route: Fetch Yard Owner Details by Yard Name
router.get('/getYardDetailsByName', authenticateToken, async (req, res) => {
    try {
        const { yardname } = req.query; // Get yard name from query parameters

        if (!yardname) {
            return res.status(400).json({ error: 'Yard name is required' });
        }

        // Fetch yard owner details by yard name (case-insensitive)
        const yardOwner = await YardOwners.findOne({ yardname: new RegExp(`^${yardname}$`, 'i') });

        if (!yardOwner) {
            return res.status(404).json({ error: 'Yard owner not found' });
        }

        res.status(200).json({
            message: 'Yard owner details fetched successfully',
            data: yardOwner,
        });
    } catch (error) {
        console.error('Error fetching yard owner details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
