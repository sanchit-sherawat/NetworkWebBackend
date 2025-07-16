const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');
const { v4: uuidv4 } = require('uuid');
const PasswordLink = require('../../models/password');
const secret = process.env.RESET_SECRET || 'your-secret-key';
const { adminOnly, normalUser } = require('../Middleware');



// Login API
const jwt = require('jsonwebtoken'); // Add this at the top

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
    userReferId = null,
    isConfirmation = 0,
    country,
    state,
    city,
    province,
    zip
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
    first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id, password, is_confirmation,
    country, state, city, province, zip
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;


    db.query(
      insertQuery,
      [
        firstName,
        lastName,
        email,
        phoneNumber,
        username,
        isAdmin,
        userReferId,
        password,
        isConfirmation,
        country,
        state,
        city,
        province,
        zip
      ],
      (err2, result) => {
        if (err2) return res.status(500).json({ message: 'Error inserting user', error: err2 });
        const ubuntuDateTime = new Date().toLocaleString('en-US', {
          timeZone: 'America/Chicago',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false  // use true for 12-hour format with AM/PM
        });

        console.log("database me dal deya gya hai ")
        const msg = {
          to: email,
          from: `VIRON NETWORK <admin@viron.network>`,
          subject: `${firstName}, Your Registration Confirmation with VIRON.NETWORK`,
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
        <p>Hello ${firstName}&nbsp;${lastName},</p>
        <p>Congratulations!<br />Your Registration has been received and your VIRON.NETWORK account has been created.</p>
        <p>You are now registered and is valuably&nbsp;<strong><u>Time &amp; Date Stamped : ${ubuntuDateTime} CST</u></strong>.</p>
        <p>Before you log-in, please take a minute to review this entire page.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; text-align: center;">
        <div style="border: 4px solid #D00000; padding: 30px;">
        <h2 style="color: #D00000; margin-bottom: 5px;">IMPORTANT NOTICE:</h2>
        <p>To finalize your <strong><u>VIRON Home-Business (&ldquo;VHB&rdquo;)</u></strong>, please log-in to your<br />back-office now to complete the critical instructions that are displayed there.</p>
        <p>To log in to your VIRON.NETWORK account, use the Username and Password you&rsquo;ve just provided during your Registration, which is as follows:</p>
        <p><strong>Username:</strong> ${username}<br>
        <strong>Password:</strong> ${password}</p>
        <p><strong>Member-Center Login Here:</strong><br /><a href="https://viron.network/member/loginPage" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">LOGIN to VIRON.NETWORK</a></p>
        <p style="font-size: 12px; color: #0000B3;">*We advise you to secure your username & password.</p>
        </div>  
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="text-align: center;"><strong>FOR YOUR CONVENIENCE:</strong></p>
        <ul>
          <li style="margin-bottom: 20px;">All Sales and Purchases are subject to the VIRON <strong>Terms of Use</strong> as described at: <a href="https://viron.network/terms-of-use" target="_blank" style="color: #0000B3;">https://viron.network/terms-of-use</a> and governs the VIRON.NETWORK website and its members. It is located at the bottom of every web page on the VIRON.NETWORK website. Further, all Members, including you, acknowledge and agree to it every time you log in. So please review it entirely.</li>
          <li><strong>Important:</strong> Although VIRON will professionally handle all major work for you, it is essential that you understand it is <em><u>your</u></em> business. We advise that you familiarize yourself with all aspects of your VIRON business. We recommend that you visit all pages of the website and review all areas of your Back-Office to become familiar and fully understand VIRON&rsquo;s game-changing capabilities.</li>
        </ul>
        <p style="text-align: center;"><a href="https://viron.network/member/loginPage" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">LOGIN to VIRON.NETWORK</a></p>
        <p>If you have any questions or need help, the best way to contact VIRON Member Support is to Email us at: <a href="mailto:Support@VIRON.NETWORK" style="color: #0000B3;">Support@VIRON.NETWORK</a>&nbsp;and our staff team will be happy to assist you during regular business hours.</p>
        <p><em><strong>Congratulations</strong></em><em><strong>and Welcome to the Evolution of Network Marketing! </strong></em></p>
        <p><br/><br/><strong><em>-The VIRON Administration</em></strong></p>
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
 // Disable SendGrid's automatic click tracking
  trackingSettings: {
    clickTracking: {
      enable: false,
      enableText: false,
    },
  },
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
        iscallcenter: user.is_callcenter,
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

// sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Ensure this is set

router.post('/payment', normalUser, (req, res) => {
  const { user_id, btc_txn, eth_txn, usdt_txn } = req.body;

  // 1. Get user info
  db.query(
    'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
    [user_id],
    (err, userResults) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });

      const user = userResults[0];
      const { email, first_name, last_name } = user;

      // 2. Check if payment already exists
      db.query(
        'SELECT id FROM payment_transaction WHERE user_id = ?',
        [user_id],
        (err2, paymentResults) => {
          if (err2) return res.status(500).json({ message: 'Database error', error: err2 });
          if (paymentResults.length > 0) {
            return res.status(409).json({ message: 'Payment already submitted. Contact admin if needed.' });
          }

          // 3. Insert new payment record
          // 3. Insert new payment record
          db.query(
            'INSERT INTO payment_transaction (user_id, btc_transaction, eth_transaction, usdt_transaction) VALUES (?, ?, ?, ?)',
            [user_id, btc_txn, eth_txn, usdt_txn],
            (err3) => {
              if (err3) return res.status(500).json({ message: 'Error saving payment', error: err3 });

              // 4. Get all admin emails
              db.query(
                'SELECT email FROM users WHERE is_admin = 1',
                (err4, adminResults) => {
                  if (err4) return res.status(500).json({ message: 'Database error', error: err4 });

                  const adminEmails = adminResults.map(a => a.email).filter(Boolean);

                  // 5. Prepare email for user
                  const msg = {
                    to: email,
                    from: `VIRON NETWORK <admin@viron.network>`,
                    subject: `${first_name},  Your Payment is Processing – VIRON.NETWORK`,
                    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 700px; margin: auto; padding: 2rem; background: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 2rem;">
      <img src="https://viron.network/assets/img/viron-logo.png" alt="Viron Logo" style="max-width: 180px;" />
    </div>
    <h2 style="color: #D00000; text-align: center; margin-bottom:0px;">IMPORTANT NOTIFICATION</h2>
    <h3 style="text-align: center; margin-top:10px"><strong>Your Payment is Processing.</strong></h3>
    <p>Hello <strong>${first_name} ${last_name}</strong>,</p>
    <p>Your cryptocurrency payment for your <strong><u>VIRON Home-Business (&ldquo;VHB&rdquo;)</u> </strong>is being processed and is awaiting confirmation on the Blockchain.<strong style="color: #D00000;"> The VIRON Administrators have been notified. </strong>Once your payment is confirmed and cleared, your VHB account status will be marked &ldquo;PAID&rdquo;.</p>
    <p>The VIRON Administrators will then correctly set up your account with the qualified <strong>third-party MLM company</strong>, which will complete your VHB.</p>
    <p>We will be in touch with you at each step, and you will be notified accordingly.</p>
    <p><strong style="color: #D00000;">EMPHASIS:</strong> Please understand that we are currently in <strong><u>PRE-LAUNCH</u></strong>. The Pre-Launch will conclude when we reach 5,500 total members. We will then automatically enter <strong>FULL-LAUNCH</strong>.</p>
    <p><strong style="color: #D00000;">STRONG EMPHASIS:</strong> Your VIRON position is currently <u>secure and locked per your Time/Date Stamp</u>. Until the Pre-Launch is over, your funds are placed in our ESCROW account. <span style="background-color: yellow;">Your funds are only drawn when the following steps are completed:</span></p>
    <ol style="list-style: none; margin: 0; padding: 0;">
      <li style="margin: 0; padding: 0 0 0 2em; position: relative;"><span style="position: absolute; left: 0; right:20px; color: #D00000; font-weight: bold;">(i.)</span>You are correctly placed with the third-party MLM company: <strong>SAVE CLUB (&ldquo;<u style="color: #0000B3;">SC</u>&rdquo;)</strong>.</li>
      <li style="margin: 0; padding: 0 0 0 2em; position: relative;"><span style="position: absolute; left: 0; right:20px; color: #D00000; font-weight: bold;">(ii.)</span>Your <strong>VIRON DRs</strong> purchased are placed into your <strong><u style="color: #0000B3;">SC</u></strong> account</li>
    </ol>
    <p><strong style="color: #D00000;">*Please be advised that VIRON continues to invest ongoing professional efforts and resources even before the completion of the above steps for you. <u>Please exercise patience during our Pre-Launch</u>. </strong>We will be with you every step of the way.</p>
    <p style="color: #0000B3; text-align:center; margin-bottom:5px; padding-bottom:0px;"><strong>VIRON TELEGRAM CHANNEL:</strong></p>
    <p>For up-to-the-minute information and company updates, we highly suggest you join VIRON&rsquo;s <strong>Telegram Channel</strong>: <a href="https://t.me/VIRON_NETWORK" style="color: #0000B3;">https://t.me/VIRON_NETWORK</a></p>
    <hr/>
      <p style="color: #0000B3; text-align:center; margin-bottom:5px; padding-bottom:0px;"><strong>VIRON MEMBER SUPPORT:</strong></p>
      <p>If you have any questions or need help, the best way to contact VIRON Member Support is via our CONTACT US page or via Email: <a href="mailto:Support@VIRON.NETWORK" style="color: #0000B3;">Support@VIRON.NETWORK</a>. Our staff team will be happy to assist you during regular business hours.</p>
    <hr/>
    <p style="text-align:center"><strong><em>Welcome to the Evolution of Network Marketing!</em></strong></p>
    <p style="text-align:center"><strong><em>-The VIRON Administration</em></strong></p>
  </body>
</html>`
                  };

                  // 6. Prepare email for admins (BCC all admins)
                  const msgToAdmins = {
                    to: adminEmails,
                    from: `VIRON NETWORK <admin@viron.network>`,
                    subject: `New Payment Submitted by ${first_name} ${last_name}`,
                    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 700px; margin: auto; padding: 2rem; background: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 2rem;">
      <img src="https://viron.network/assets/img/viron-logo.png" alt="Viron Logo" style="max-width: 180px;" />
    </div>
    <h2 style="color: #D00000; text-align: center; margin-bottom:0px;">IMPORTANT NOTIFICATION</h2>
    <h3 style="text-align: center; margin-top:10px"><strong> ${first_name} ${last_name} user Payment has been  done.</strong></h3><p>User Transaction Details  is below</p>
    <p>btc_transaction : ${btc_txn}</p> <br>
     <p>eth_transaction : ${eth_txn}</p>  <br> 
      <p>usdt_transaction : ${usdt_txn}</p><br>
    <p style="text-align:center"><strong><em>-The VIRON Administration</em></strong></p>
  </body>
</html>`
                  };

                  // 7. Send both emails
                  Promise.all([
                    sgMail.send(msg),
                    adminEmails.length > 0 ? sgMail.sendMultiple(msgToAdmins) : Promise.resolve()
                  ])
                    .then(() => {
                      return res.status(201).json({ message: 'Payment saved successfully. Email sent.' });
                    })
                    .catch(error => {
                      return res.status(201).json({
                        message: 'Payment saved successfully, but email failed to send.',
                        error: error.message,
                      });
                    });
                }
              );
            }
          );
        }
      );
    }
  );
});




router.get('/users', adminOnly, (req, res) => {
  const userSql = `
    SELECT 
      u.id, u.first_name, u.last_name, u.email, u.phone_number, u.user_name, u.is_admin, u.user_refer_id,
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

// // Get all users
// router.get('/users', adminOnly,(req, res) => {
//   db.query('SELECT id, first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id FROM users', (err, results) => {
//     if (err) return res.status(500).json({ message: 'Database error', error: err });
//     res.json(results);
//   });
// });

// Get user by ID
router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  db.query(
    `SELECT 
      id, first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id,
      country, state, city, province, zip, dob, homestatus, employmentstatus, householdincome, petstatus, feedback, created_at
    FROM users WHERE id = ?`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      res.json(results[0]);
    }
  );
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

  // Check if input is email
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
  // Check if input is phone number (basic check, adjust regex as needed)
  const isPhone = /^\+?\d{10,15}$/.test(username);

  let query = '';
  let params = [];

  if (isEmail) {
    query = 'SELECT id FROM users WHERE email = ?';
    params = [username];
  } else if (isPhone) {
    query = 'SELECT id FROM users WHERE phone_number = ?';
    params = [username];
  } else {
    query = 'SELECT id FROM users WHERE user_name = ?';
    params = [username];
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.json({ exists: false });
    res.json({ exists: true, userId: results[0].id });
  });
});
// Update own user info (normal user)
// Update own user info (normal user)
router.put('/profile', normalUser, (req, res) => {
  const userId = req.user.userId; // from JWT
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    userName,
    country,
    state,
    city,
    province,
    zip,
    dob,
    homeStatus,

    employmentStatus,
    householdIncome,
    petStatus,
    fedback,
    socialMedia,
  } = req.body;

  const fields = [];
  const values = [];

  if (firstName !== undefined) {
    fields.push('first_name = ?');
    values.push(firstName);
  }
  if (lastName !== undefined) {
    fields.push('last_name = ?');
    values.push(lastName);
  }
  if (email !== undefined) {
    fields.push('email = ?');
    values.push(email);
  }
  if (phoneNumber !== undefined) {
    fields.push('phone_number = ?');
    values.push(phoneNumber);
  }
  if (userName !== undefined) {
    fields.push('user_name = ?');
    values.push(userName);
  }

  // New fields
  if (country !== undefined) {
    fields.push('country = ?');
    values.push(country);
  }
  if (state !== undefined) {
    fields.push('state = ?');
    values.push(state);
  }
  if (city !== undefined) {
    fields.push('city = ?');
    values.push(city);
  }
  if (province !== undefined) {
    fields.push('province = ?');
    values.push(province);
  }
  if (zip !== undefined) {
    fields.push('zip = ?');
    values.push(zip);
  }
  if (dob !== undefined && dob !== '') {
    fields.push('dob = ?');
    values.push(dob);
  }
  if (homeStatus !== undefined) {
    fields.push('homestatus = ?');
    values.push(homeStatus);
  }
  if (employmentStatus !== undefined) {
    fields.push('employmentstatus = ?');
    values.push(employmentStatus);
  }
  if (householdIncome !== undefined) {
    fields.push('householdincome = ?');
    values.push(householdIncome);
  }
  if (petStatus !== undefined) {
    fields.push('petstatus = ?');
    values.push(petStatus);
  }
  if (fedback !== undefined) {
    fields.push('feedback = ?');
    values.push(fedback);
  }
  if (socialMedia !== undefined) {
    fields.push('social_media = ?');
    values.push(socialMedia);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  values.push(userId);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json({ message: 'Profile updated successfully' });
  });
});


// Get own profile (normal user)
router.get('/profile', normalUser, (req, res) => {
  const userId = req.user.userId; // from JWT

  db.query(
    `SELECT 
      id, first_name, last_name, email, phone_number, user_name, is_admin, user_refer_id, social_media as socialMedia,
      country, state, city, province, zip, dob, homestatus, employmentstatus, householdincome, petstatus, feedback, created_at
    FROM users WHERE id = ?`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      res.json(results[0]);
    }
  );
});

// Admin: Confirm a user (set is_confirmation)
router.put('/users/:id/confirm', adminOnly, (req, res) => {
  const userId = req.params.id;
  const { isConfirmation = 1 } = req.body; // default to 1 (confirmed)

  db.query(
    'UPDATE users SET is_confirmation = ? WHERE id = ?',
    [isConfirmation, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User confirmation status updated successfully' });
    }
  );
});


// Helper for email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Update password by email
router.put('/update-password', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Email is not valid' });
  }

  // Check if user exists
  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    // Update password
    db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [password, email],
      (err2, result) => {
        if (err2) return res.status(500).json({ message: 'Database error', error: err2 });
        res.json({ message: 'Password updated successfully' });
      }
    );
  });
});

// Get user creation timestamp by username
router.get('/user-created-at', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  db.query(
    'SELECT created_at FROM users WHERE user_name = ?',
    [username],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      // Return username and creation timestamp
      console.log("results are :", results)
      console.log("username is :", username)
      console.log("created_at is :", results[0].created_at)
      res.json({ username, createdAt: results[0].created_at });
    }
  );
});


router.delete("/user/:id", adminOnly, (req, res) => {

  const userId = req.params.id;



  db.query(
    'DELETE FROM users WHERE id=?',
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'Your user has been deleted' })

    }

  )




})


// GET /api/getuser/:username
router.get('/getuser/:username', (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const sql = `
    SELECT user_name AS userName, first_name AS firstName, last_name AS lastName 
    FROM users 
    WHERE user_name = ?
    LIMIT 1
  `;

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Database error in getuser:", err);
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(results[0]);
  });
});



// Get payment status and referrer info for a user
router.get('/user-payment-status/:userId', async (req, res) => {
  const userId = req.params.userId;

  console.log("userId is :", userId)

  // 1. Get user info (including ds_id and is_confirmation)
  db.query(
    `SELECT ds_id, is_confirmation FROM users WHERE id = ?`,
    [userId],
    (err, userResults) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });

      const { ds_id, is_confirmation } = userResults[0];

      // 2. Get payment transaction for this user
      db.query(
        `SELECT id FROM payment_transaction WHERE user_id = ? LIMIT 1`,
        [userId],
        (err2, paymentResults) => {
          if (err2) return res.status(500).json({ message: 'Database error', error: err2 });

          let paymentStatus = "Not Paid";
          if (paymentResults.length > 0) {
            paymentStatus = is_confirmation == 1 ? "Paid" : "Verification Pending";
          }

          // 3. Get referrer full name (if user_refer_id exists)
          if (ds_id) {
            db.query(
              `SELECT CONCAT(first_name, ' ', last_name) AS fullName, user_name AS userName FROM users WHERE id = ?`,
              [ds_id],
              (err3, referResults) => {
                if (err3) return res.status(500).json({ message: 'Database error', error: err3 });
                const referFullName = referResults.length > 0 ? referResults[0].fullName : null;
                const referUserName = referResults.length > 0 ? referResults[0].userName : null;
                res.json({
                  paymentStatus,
                  userReferId: ds_id,
                  referFullName,
                  referUserName
                });
              }
            );
          } else {
            res.json({
              paymentStatus,
              userReferId: null,
              referFullName: null,
              referUserName: null
            });
          }
        }
      );
    }
  );
});

// ...existing code...

module.exports = router;