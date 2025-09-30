const mongoose = require("mongoose")

const ContactSchema = new mongoose.Schema(
  {
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    company: { type: String },  
    service: { type: String, required: true },
    timeline: { type: String },
    message: { type: String },
    consent: { type: Boolean},
    newsletter: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Contact", ContactSchema)
