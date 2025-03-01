// models/StateCityPincode.js
const mongoose = require('mongoose');


const stateCityPincodeSchema = new mongoose.Schema({
  areaName: { type: String, required: true },
  pincode: { type: String, required: true },
  taluk: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true }
});

module.exports = mongoose.model('StateCityPincode', stateCityPincodeSchema, 'statecity_pincode_data');
 