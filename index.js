require('dotenv').config();
const express = require("express");
const cors = require("cors");
const connectDB = require('./config/db');
const Contact = require('./models/contacts');  // Capitalized model
const sgMail = require("@sendgrid/mail");
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

connectDB();  

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
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post("/api/contact", async (req, res) => {
  try {
    const { fname, lname, email, message } = req.body;

    const existingContact = await Contact.findOne({ email });
    if (existingContact) {
      return res.status(400).json({ error: "This email has already submitted a message." });
    }

    // Save to database
    const newContact = new Contact(req.body);
    await newContact.save();

    // ===== 1. Send to Codex inbox =====
    const businessMsg = {
      to: "contacts@codex.ng",
      from: {
        email: process.env.BRANDED_EMAIL,
        name: `${fname} ${lname}`,
      },
      replyTo: email, // replies go back to visitor
      subject: `New Contact Form Submission from ${fname} ${lname}`,
      html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1f2937; font-size: 24px; margin: 0;">📩 New Contact Submission</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0;">A new message has been submitted via your website</p>
        </header>
        
        <section style="background: #ffffff; padding: 15px 20px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p><strong>Name:</strong> ${fname} ${lname}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${message ? `<p><strong>Message:</strong></p><p style="margin: 5px 0 0; line-height: 1.5;">${message}</p>` : ""}
        </section>
        
        <footer style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>Sent via Codex Website Contact Form</p>
        </footer>
      </div>
    `,

    };

    // ===== 2. Auto-reply to Visitor =====
    const visitorMsg = {
      to: email,
      from: {
        email: process.env.BRANDED_EMAIL, // inbox@codex.ng (verified)
        name: "Codex Team",
      },
      subject: "Thank you for contacting Codex 🚀",
      html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1f2937; font-size: 24px; margin: 0;">Thank You for Contacting Us, ${fname}!</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0;">We’ve received your message and our team will get back to you shortly.</p>
        </header>

        <section style="background: #ffffff; padding: 15px 20px; border-radius: 6px; border: 1px solid #e5e7eb; line-height: 1.6;">
          <p>Here’s a quick overview of the services we offer:</p>
          <ul style="padding-left: 20px; margin: 10px 0;">
            <li>🌐 Website Development</li>
            <li>📡 Network Installation</li>
            <li>⚙️ Business Automation (Odoo)</li>
            <li>🚀 Starlink Installation</li>
          </ul>
          <p>If your inquiry is urgent, feel free to reply to this email directly.</p>
        </section>

        <footer style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>Sent via Codex Website Contact Form</p>
        </footer>
      </div>
    `,

    };

    // Send both emails
    await sgMail.send(businessMsg);
    await sgMail.send(visitorMsg);

    res.status(201).json({
      message: "Form submitted, emails sent successfully",
      contact: newContact,
    });
  } catch (error) {
    console.error("SendGrid error:", error);
    res.status(500).json({ error: "Email failed" });
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
    const { fname, lname, email, phone, message, service } = req.body;

    const existingContact = await Contact.findOne({ email });
    if (existingContact) {
      return res.status(400).json({ error: "This email has already submitted a message." });
    }

    // Save to database
    const quickContact = new Contact(req.body);
    await quickContact.save();

    // ===== 1. Send to Codex inbox =====
    const businessMsg = {
      to: "contacts@codex.ng",
      from: {
        email: process.env.BRANDED_EMAIL, // must be verified in SendGrid
        name: `${fname} ${lname}`,
      },
      replyTo: email, // replies go back to visitor
      subject: `New Quick Contact Submission from ${fname} ${lname}`,
      html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1f2937; font-size: 24px; margin: 0;">📩 New Contact Submission</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0;">A new message has been submitted via your website</p>
        </header>
        
        <section style="background: #ffffff; padding: 15px 20px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p><strong>Name:</strong> ${fname} ${lname}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || ""}</p>
          <p><strong>Service:</strong> ${service || ""}</p>
          ${message ? `<p><strong>Message:</strong></p><p style="margin: 5px 0 0; line-height: 1.5;">${message}</p>` : ""}
        </section>
        
        <footer style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>Sent via Codex Website Contact Form</p>
        </footer>
      </div>
    `,

    };

    // ===== 2. Auto-reply to Visitor =====
    const visitorMsg = {
      to: email,
      from: {
        email: process.env.BRANDED_EMAIL,
        name: "Codex Team",
      },
      subject: "Thank you for contacting Codex 🚀",
      html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
        <header style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1f2937; font-size: 24px; margin: 0;">Thank You for Contacting Us, ${fname}!</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0;">We’ve received your message and our team will get back to you shortly.</p>
        </header>

        <section style="background: #ffffff; padding: 15px 20px; border-radius: 6px; border: 1px solid #e5e7eb; line-height: 1.6;">
          <p>Here’s a quick overview of the services we offer:</p>
          <ul style="padding-left: 20px; margin: 10px 0;">
            <li>🌐 Website Development</li>
            <li>📡 Network Installation</li>
            <li>⚙️ Business Automation (Odoo)</li>
            <li>🚀 Starlink Installation</li>
          </ul>
          <p>If your inquiry is urgent, feel free to reply to this email directly.</p>
        </section>

        <footer style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>Sent via Codex Website Contact Form</p>
        </footer>
      </div>
    `,

    };

    // Send emails
    await sgMail.send(businessMsg);
    await sgMail.send(visitorMsg);

    res.status(201).json({
      message: "Quick contact submitted and emails sent successfully",
      quickContact,
    });
  } catch (error) {
    console.error("SendGrid error:", error);
    res.status(500).json({ error: "Email failed" });
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
