const mongoose =  require("mongoose")

const QuickContactSchema = new mongoose.Schema(
  {
    Yname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    service: { type: String },
    message: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model("QuickContact", QuickContactSchema)
