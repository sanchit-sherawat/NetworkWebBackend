const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');
const { v4: uuidv4 } = require('uuid');
const PasswordLink = require('../../models/password');
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

// Delete user by ID
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json({ message: 'User deleted successfully' });
  });
});

// ...existing code...

module.exports = router;