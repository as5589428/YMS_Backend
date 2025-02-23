const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InwardEntrySchema = new Schema({
  yardname: {
    type: String,
    required: true,
  },
  contact_person: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  inward_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  item_name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  remarks: {
    type: String,
  },
  photo: { type: String }, // Image of the item if needed
});

module.exports = mongoose.model('InwardEntry', InwardEntrySchema);
