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
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Registration Confirmation - VIRON.NETWORK</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px; background-color:#ffffff; font-family: Arial, sans-serif; color:#333333; line-height:1.6;">
    <tr>
      <td style="padding: 30px;">
        <p>Hello ${firstName} ${lastName},</p>
        <p>Your registration has been received and your VIRON.NETWORK account has been created.</p>
        <p>You are now registered and it is valuably <strong><u>Time &amp; Date Stamped</u></strong>.</p>
        <p>Before you log in, please take a couple of minutes to review this entire message.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; text-align: center;">
        <div style="border: 2px solid #D00000; padding: 30px;">
        <p>To finalize your Viron account, please log in to your back-office now and complete the critical instructions displayed there.</p>
        <p>To log in to your VIRON.NETWORK account, use the username and password you provided during registration:</p>
        <p><strong>Username:</strong> ${username}<br>
        <strong>Password:</strong> ${password}</p>

        <p><strong>Login to Member-Center here:</strong><br /><a href="http://148.113.201.173:4000/#/login" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">Login</a></p>
        <p style="font-size: 12px; color: #888888;">*We advise you to secure your password and not reveal it to anyone.</p>
        </div>  
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="text-align: center;"><strong>FOR YOUR CONVENIENCE</strong></p>
        <p>For your records, we have also sent you an email containing the above information. *Just in case, please check your inbox and spam folder.</p>
        <p style="text-align: center;"><strong>GENERAL NOTICES &amp; FYIs:</strong></p>
        <ul>
          <li>All sales and purchases are subject to the Viron <strong>Terms of Use</strong> described at: <a href="http://www.VIRON.NETWORK/termsofuse.pdf" style="color: #6ecaf4;">http://www.VIRON.NETWORK/termsofuse.pdf</a>. These Terms of Use govern the VIRON.NETWORK website and its members. They are located at the bottom of every web page on the VIRON.NETWORK website. Further, all Viron Members, including you, acknowledge and agree to them every time you log in. So please review them entirely.</li>
          <li><strong>Important:</strong> Although Viron will do ALL the major work for you, it is imperative you understand that it is <em><u>YOUR</u></em> business. We recommend you visit all pages of the website and review all areas of your VIRON Back-Office to become familiar and fully grasp VIRON’s game-changing existence.</li>
        </ul>
        <p>If you have any questions or need help, the best way to contact Member Support is to email us at: <a href="mailto:HelpDesk@VIRON.NETWORK" style="color: #6ecaf4;">HelpDesk@VIRON.NETWORK</a> and our team will be happy to assist you during regular business hours.</p>
        <p><em><strong>Congratulations and Welcome to the Evolution of Network Marketing!</strong></em></p>
        <p>To your success!</p>
        <p><strong>- VIRON Administration Team</strong></p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f5f5f5; text-align:center; padding:20px; font-size:12px; color:#777;">
        &copy; 2025 VIRON.NETWORK. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
`,
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