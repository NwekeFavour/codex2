require('dotenv').config();
const express = require("express");
const cors = require("cors");

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

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
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

  
  
app.post('/trigger-zap', async (req, res) => {
  try {
    const response = await fetch(zapierWebhookURL, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json(); // Zapier usually responds with JSON
    res.status(200).json({ success: true, zapierResponse: data });
  } catch (error) {
    console.error("Error triggering Zapier:", error);
    res.status(500).json({ success: false, error: "Failed to trigger Zap" });
  }
});

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
