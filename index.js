require('dotenv').config();
const express = require("express");
const cors = require("cors");
const configDB = require('./config/db');
const Contact = require('./models/contacts');  // Capitalized model
const Qcontact = require('./models/Qcontact');

const app = express();
const PORT = process.env.PORT || 5001;
const zapierWebhookURL = process.env.ZAPIER_WEBHOOK_URL;
const zapierWebhookUrltwo = process.env.ZAPIER_WEBHOOK_URLTWO; 

app.use(express.json());

const allowedOrigins = [
  'http://localhost:3000',
  'https://codex.ng',
  'https://www.codex.ng'
];

configDB();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Auth Routes
app.use("/api/auth", require("./routes/authRoutes"));

// ✅ Contact POST
app.post("/api/contact", async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.status(201).json({ message: "Form submitted successfully", contact: newContact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Contacts GET
app.get("/api/contacts", async (req, res) => {
  try {
    const allContacts = await Contact.find().sort({ createdAt: -1 }); // use Contact model
    res.status(200).json(allContacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Quick Contact
app.post("/api/quick-contact", async (req, res) => {
  try {
    const quickContact = new Qcontact(req.body);
    await quickContact.save();
    res.status(201).json({ message: "Quick contact submitted successfully", quickContact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Zapier One
app.post('/trigger-zap', async (req, res) => {
  try {
    const response = await fetch(zapierWebhookURL, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(200).json({ success: true, zapierResponse: data });
  } catch (error) {
    console.error("Error triggering Zapier:", error);
    res.status(500).json({ success: false, error: "Failed to trigger Zap" });
  }
});

// ✅ Zapier Two
app.post('/trigger-zap-two', async (req, res) => {
  try {
    const response = await fetch(zapierWebhookUrltwo, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(200).json({ success: true, zapierResponse: data });
  } catch (error) {
    console.error("Error triggering Zapier:", error);
    res.status(500).json({ success: false, error: "Failed to trigger Zap" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
