// server.js - Main server file for BarterNow backend

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified BOOLEAN DEFAULT FALSE
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database', err);
  }
}

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate a random 6-digit code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Route to handle initial email submission
app.post('/api/signup', async (req, res) => {
  const { email, userType } = req.body;
  
  if (!email || !userType) {
    return res.status(400).json({ error: 'Email and user type are required' });
  }
  
  try {
    // Generate verification code
    const code = generateVerificationCode();
    
    // Store in database
    await pool.query(
      'INSERT INTO verification_codes (email, user_type, code) VALUES ($1, $2, $3)',
      [email, userType, code]
    );
    
    // Send email with verification code
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'BarterNow - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to BarterNow!</h2>
          <p>Thank you for your interest in BarterNow. To complete your registration, please use the verification code below:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${code}
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <p>Best regards,<br>The BarterNow Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Error in signup process', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route to verify the code
app.post('/api/verify', async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }
  
  try {
    // Check the verification code
    const verificationResult = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND created_at > NOW() - INTERVAL \'30 minutes\' AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );
    
    if (verificationResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }
    
    const verification = verificationResult.rows[0];
    
    // Mark the code as verified
    await pool.query(
      'UPDATE verification_codes SET verified = TRUE WHERE id = $1',
      [verification.id]
    );
    
    // Add or update the user in the users table
    await pool.query(
      `INSERT INTO users (email, user_type, verified) 
       VALUES ($1, $2, TRUE) 
       ON CONFLICT (email) 
       DO UPDATE SET user_type = $2, verified = TRUE`,
      [email, verification.user_type]
    );
    
    res.status(200).json({ message: 'Email successfully verified' });
  } catch (err) {
    console.error('Error in verification process', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize database and start server
initDb().then(() => {
  app.listen(port, () => {
    console.log(`BarterNow backend server running on port ${port}`);
  });
});