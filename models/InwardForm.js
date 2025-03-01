const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Import the UUID generator

// Define the checklist item schema
const ChecklistItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  yes: { type: Boolean, default: false },
  no: { type: Boolean, default: false }
});

// Define the main schema
const InwardFormSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    default: uuidv4, // Generate a unique ID automatically
    unique: true     // Ensure uniqueness in the database
  },
  clientName: { type: String, required: true },
  agreementNumber: { type: String, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  variant: { type: String, required: true },
  refNo: { type: String, required: true },
  segment: { type: String, required: true },
  loanNo: { type: String, required: true },
  fuelType: { type: String, required: true },
  odometerReading: { type: String, required: true },
  yard: { type: String, required: true },
  inwardDateTime: { type: String, required: true },
  geoLocation: { type: String, required: true },

  // Vehicle Details section
  vehicleDetails: {
    customerName: { type: String, required: true },
    engineNumber: { type: String, required: true },
    chassisNumber: { type: String, required: true },
    color: { type: String, required: true },
    vehicleClass: { type: String, required: true },
    vehicleCondition: { type: String, required: true },
    keyLocation: { type: String, required: true },
    transmission: { type: String, required: true },
    remarks: { type: String }          
  },
  
  // Images
  vahanImage: { type: String, required: false }, // Required image
  preIntimationLetter: { type: String, required: false },  // Optional
  postIntimationLetter: { type: String, required: false }, // Optional
  authorizationLetter: { type: String, required: false }, // Optional

  // Checklist section
  checklist: {
    type: [ChecklistItemSchema],
    default: [
      { label: "Key", yes: false, no: false },
      { label: "Light", yes: false, no: false },
      { label: "Horns", yes: false, no: false },
      { label: "Wiper Blade", yes: false, no: false },
      { label: "Back Wiper", yes: false, no: false },
      { label: "Music System", yes: false, no: false },
      { label: "Roast Light", yes: false, no: false },
      { label: "Speaker", yes: false, no: false },
      { label: "Roof Light", yes: false, no: false },
      { label: "Fan", yes: false, no: false },
      { label: "Rear View", yes: false, no: false },
      { label: "Door Mirror", yes: false, no: false },
      { label: "Sun Visor", yes: false, no: false },
      { label: "Rain Visor", yes: false, no: false },
      { label: "Fuel Cap", yes: false, no: false },
      { label: "Battery Make", yes: false, no: false },
      { label: "Battery", yes: false, no: false },
      { label: "Door Handle", yes: false, no: false },
      { label: "Door Glass", yes: false, no: false },
      { label: "Stepney", yes: false, no: false },
      { label: "Jack", yes: false, no: false },
      { label: "Jack Rod", yes: false, no: false },
      { label: "Wheel Spanner", yes: false, no: false },
      { label: "Tool", yes: false, no: false },
      { label: "Rope", yes: false, no: false },
      { label: "Tarpaulin", yes: false, no: false },
      { label: "Cultivator", yes: false, no: false },
      { label: "Tyre", yes: false, no: false }
    ]
  },

  // Vehicle photos
  vehiclePhotos: {
    frontView: { type: String, default: null },
    rightView: { type: String, default: null },
    backView: { type: String, default: null },
    leftView: { type: String, default: null },
    engineView: { type: String, default: null },
    meterReading: { type: String, default: null }
  },

  // Tire photos
  tyrePhotos: {
    tyre1: { type: String, default: null },
    tyre2: { type: String, default: null },
    tyre3: { type: String, default: null },
    tyre4: { type: String, default: null },
    tyre5: { type: String, default: null },
    tyre6: { type: String, default: null },
    tyre7: { type: String, default: null },
    tyre8: { type: String, default: null },
    tyre9: { type: String, default: null },
    tyre10: { type: String, default: null },
    stepneyTyre: { type: String, default: null } // Optional stepney tyre image
  },
},{ timestamps: true });

const InwardForm = mongoose.model('InwardForm', InwardFormSchema);

module.exports = InwardForm;