const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');
const { v4: uuidv4 } = require('uuid');
const PasswordLink = require('../../models/password');
const { adminOnly, normalUser } = require('../Middleware');
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
  const userSql = `
    SELECT 
      u.id, u.first_name, u.last_name, u.email, u.phone_number, u.user_name, u.is_admin, u.user_refer_id,u.is_confirmation,
      p.btc_transaction, p.eth_transaction, p.usdt_transaction
    FROM users u
    LEFT JOIN payment_transaction p ON u.id = p.user_id
  `;

  console.log("userSql is :", userSql)

  db.query(userSql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    console.log("results are :", results)

    // Map results to include transaction type and value
    const users = results.map(user => {
      let transaction = null;
      if (user.btc_transaction) {
        transaction = { type: 'btc_transaction', value: user.btc_transaction };
      } else if (user.eth_transaction) {
        transaction = { type: 'eth_transaction', value: user.eth_transaction };
      } else if (user.usdt_transaction) {
        transaction = { type: 'usdt_transaction', value: user.usdt_transaction };
      }
      // Remove raw transaction columns from output
      const { btc_transaction, eth_transaction, usdt_transaction, ...userData } = user;
      return { ...userData, transaction };
    });

    res.json(users);
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


// Confirm user only if payment exists (admin only)
router.put('/users/:id/confirm', adminOnly, (req, res) => {
  const userId = req.params.id;

  // Check if payment exists for this user
  db.query('SELECT id FROM payment_transaction WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length === 0) {
      return res.status(400).json({ message: 'No payment found for this user. Cannot confirm.' });
    }

    // Set is_confirmation = 1
    db.query('UPDATE users SET is_confirmation = 1 WHERE id = ?', [userId], (err2, result) => {
      if (err2) return res.status(500).json({ message: 'Database error', error: err2 });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User confirmed successfully.' });
    });
  });
});

// ...existing code...

module.exports = router;