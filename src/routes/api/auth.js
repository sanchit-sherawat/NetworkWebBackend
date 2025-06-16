const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');
const { v4: uuidv4 } = require('uuid');
const PasswordLink = require('../../models/password');
const secret = process.env.RESET_SECRET || 'your-secret-key';

router.post('/register', (req, res) => {
  console.log("regestriantoi user detail. :", req.body)

  const {
    firstName,
    password,
    lastName,
    email,
    phoneNumber,
    username,
    isAdmin = 0,
    userReferId = null
  } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ message: 'First name, last name, email and phone number are required' });
  }

  console.log("regestriantoi user detail. :", req.body)

  // Check if user already exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    console.log("email is not there")

    // Insert user with optional fields
    const insertQuery = `
      INSERT INTO users (
        first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id, password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [firstName, lastName, email, phoneNumber, username , isAdmin, userReferId, password],
      (err2, result) => {
        if (err2) return res.status(500).json({ message: 'Error inserting user', error: err2 });
        
        console.log("database me dal deya gya hai ")
        const msg = {
          to: email,
          from: "admin@viron.network",
          subject: 'Complete Your Registration - Set Your Password',
          html: `<p>Hi <b>${firstName} ${lastName}</b>,</p>
                     <p>Thank you for registering on Viron Network.</p>`,
        };

        sgMail.send(msg)
          .then(() => res.status(201).json({ message: 'User registered. Set password link sent!' }))
          .catch((error) => res.status(201).json({
            message: 'User registered, but email failed to send',
            error: error.message
          }));
      }

      



    );
    console.log("emai send kr deya hai pura  gya")
  });
});



// Login API
const jwt = require('jsonwebtoken'); // Add this at the top

// Login API
router.post('/login', (req, res) => {
  console.log("login user detail. :", req.body)
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE user_name = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const user = results[0];
      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.user_name },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );
      res.json({
        message: 'Login successful',
        token,
        username: user.user_name,
        userId: user.id,
        isAdmin: user.is_admin,
      });
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

// POST /api/payment
router.post('/payment', async (req, res) => {
  const { user_id, btc_txn, eth_txn, usdt_txn } = req.body;

  try {
    await db.query(
      'INSERT INTO payment_transaction (user_id, btc_transaction, eth_transaction, usdt_transaction) VALUES (?, ?, ?, ?)',
      [user_id, btc_txn, eth_txn, usdt_txn]
    );
    res.status(200).json({ message: 'Payment saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving payment' });
  }
});


// Get all users
router.get('/users', (req, res) => {
  db.query('SELECT id, first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id FROM users', (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json(results);
  });
});

// Get user by ID
router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  db.query('SELECT id, first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(results[0]);
  });
});

// Update user by ID
router.put('/users/:id', (req, res) => {
  const userId = req.params.id;
  const { firstName, lastName, email, phoneNumber, userName, isAdmin, userReferId } = req.body;
  db.query(
    'UPDATE users SET first_name=?, last_name=?, email=?, phone_number=?, user_name=?, is_admin=?, user_refer_id=? WHERE id=?',
    [firstName, lastName, email, phoneNumber, userName, isAdmin, userReferId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      res.json({ message: 'User updated successfully' });
    }
  );
});



// Check if username exists API
router.get('/check-username', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  db.query('SELECT id FROM users WHERE user_name = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    // If results.length === 0, username does not exist (valid for new registration)
    res.json({ exists: results.length > 0 });
  });
});

// ...existing code...

module.exports = router;