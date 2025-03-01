const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    reminderId: { type: String, unique: true, required: true }, // 4-digit unique ID
    amount: Number,
    message: String,
    date: String,
    recurrence: String,
    paymentMethod: String,
    category: String,
    status: String
});

const Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;
