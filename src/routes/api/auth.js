const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const transporter = require('../../config/mailer');

// Registration API
router.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Username, password, and email required' });
  }
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    db.query(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email],
      (err2) => {
        if (err2) return res.status(500).json({ message: 'Database error' });
        // Send registration email
        transporter.sendMail({
          from: '"Viron Network" <your_email@gmail.com>',
          to: email,
          subject: 'Registration Successful',
          text: `Hello ${username},\n\nThank you for registering at Viron Network!`,
          html: `<p>Hello <b>${username}</b>,</p><p>Thank you for registering at Viron Network!</p>`
        }, (err3) => {
          if (err3) {
            return res.status(500).json({ message: 'Registered, but email failed to send.' });
          }
          res.json({ message: 'Registration successful. Confirmation email sent!' });
        });
      }
    );
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