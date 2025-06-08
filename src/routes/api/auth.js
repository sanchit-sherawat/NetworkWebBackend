const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');
const { v4: uuidv4 } = require('uuid');
const PasswordLink = require('../../models/password');
const secret = process.env.RESET_SECRET || 'your-secret-key';

router.post('/register', (req, res) => {
  const { firstName, lastName, email, phoneNumber } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if user already exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Insert user
    const insertQuery = `
      INSERT INTO users (first_name, last_name, email, phone_number)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertQuery, [firstName, lastName, email, phoneNumber], (err2, result) => {
      if (err2) return res.status(500).json({ message: 'Error inserting user', error: err2 });

      const insertedUserId = result.insertId;
      const token = uuidv4();
      const encryptedToken = PasswordLink.encryptUrl(token, secret);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      db.query(
        'INSERT INTO password_links (user_id, url, created_at, expires_at) VALUES (?, ?, NOW(), ?)',
        [insertedUserId, encryptedToken, expiresAt],
        (err3) => {
          if (err3) return res.status(500).json({ message: 'Error saving password link', error: err3 });

          const setPasswordUrl = `http://localhost:3000/set-password?token=${encodeURIComponent(encryptedToken)}`;
          const msg = {
            to: email,
            from: "admin@viron.network",
            subject: 'Set Your Password',
            html: `<p>Hi <b>${firstName} ${lastName}</b>,</p>
                   <p>Click <a href="${setPasswordUrl}">here</a> to set your password. This link expires in 1 hour.</p>`,
          };

          sgMail.send(msg)
            .then(() => res.status(201).json({ message: 'User registered. Set password link sent!' }))
            .catch((error) => res.status(201).json({
              message: 'User registered, but email failed to send',
              error: error.message
            }));
        }
      );
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
// ...existing code...

// Create/Set Password API
router.post('/set-password', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Check if user exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (consider hashing in production)
    db.query('UPDATE users SET password = ? WHERE email = ?', [password, email], (err2) => {
      if (err2) return res.status(500).json({ message: 'Error updating password', error: err2 });
      res.json({ message: 'Password set successfully' });
    });
  });
});

// ...existing code...

module.exports = router;