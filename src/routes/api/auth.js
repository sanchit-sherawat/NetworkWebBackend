const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');

// Register User (no password)
router.post('/register', (req, res) => {
  const { firstName, lastName, email, phoneNumber } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if user already exists by email
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    const insertQuery = `
      INSERT INTO users (first_name, last_name, email, phone_number)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertQuery, [firstName, lastName, email, phoneNumber], (err2) => {
      if (err2) return res.status(500).json({ message: 'Error inserting user', error: err2 });
     // validatePhoneNumber(phoneNumber); // Validate phone number via WhatsApp

      // // Send welcome email
      // transporter.sendMail({
      //   from: '"Viron Network" <your_email@gmail.com>',
      //   to: email,
      //   subject: 'Welcome to Viron Network',
      //   html: `<p>Hi <b>${firstName} ${lastName}</b>,</p><p>Thank you for registering with Viron Network!</p>`
      // }, (err3) => {
      //   console.log('Email sent:', !err3);
      //   if (err3) {
      //     return res.status(500).json({ message: 'User created, but email failed to send', error: err3 });
      //   }
      //   res.status(201).json({ message: 'User registered successfully and email sent!' });
      // });
      const msg = {
        to: email,
        from: "admin@viron.network",
        subject: 'Test Email from SendGrid',
        text: 'Plaintext message body',
        html: '<strong>This is a test email using SendGrid API</strong>',
      };
      console.log('Sending email to:', email);

      sgMail
        .send(msg)
        .then(() => console.log('✅ Email sent'))
        .catch((error) => console.error('❌ Email error:', error.response.body));
    });
  });
});



// Login API
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      res.json({ message: 'Login successful' });
    }
  );
});

module.exports = router;