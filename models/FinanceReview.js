const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
reviewId: { type: Number, unique: true, required: true }, // 4-5 digit unique number
reviewText: { type: String, required: true },
createdAt: { type: Date, default: Date.now }
}, { collection: 'finance_review' }); // Ensure it uses the correct collection

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
