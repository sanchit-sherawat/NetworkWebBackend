const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const sgMail = require('../../config/mailer');
const validatePhoneNumber = require('../../config/whatsapp');
const { v4: uuidv4 } = require('uuid');
const PasswordLink = require('../../models/password');
const { adminOnly, normalUser } = require('../Middleware');
// const { use } = require('react');
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
  if (user_id === undefined || (btc_txn === undefined && eth_txn === undefined && usdt_txn === undefined)) {
    return res.status(400).json({ message: 'user_id and at least one transaction type are required' });
  }
  if (!user_id || (!btc_txn && !eth_txn && !usdt_txn)) {
    return res.status(400).json({ message: 'user_id and at least one transaction type are required' });
  }



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
      u.id, u.first_name, u.last_name, u.email, u.phone_number, u.user_name, u.is_admin, u.user_refer_id,u.is_confirmation,u.created_at as user_created_at,u.ds_id,
      u.country, u.state, u.city, u.province, u.zip, u.dob, u.homestatus, u.employmentstatus, u.householdincome, u.petstatus, u.feedback,
      p.btc_transaction, p.eth_transaction, p.usdt_transaction, p.created_at,
      (
        SELECT COUNT(*) FROM users WHERE ds_id = u.id
      ) AS ds_count
    FROM users u
    LEFT JOIN payment_transaction p ON u.id = p.user_id
    WHERE u.is_admin != 1 AND (u.is_callcenter IS NULL OR u.is_callcenter != 1)
  `;

  console.log("userSql is :", userSql)

  db.query(userSql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    console.log("results are :", results)

    // Map results to include transaction type and value
    const users = results.map(user => {
      let transaction = null;
      if (user.btc_transaction) {
        transaction = { type: 'btc_transaction', value: user.btc_transaction, created_at: user.created_at };
      } else if (user.eth_transaction) {
        transaction = { type: 'eth_transaction', value: user.eth_transaction, created_at: user.created_at };
      } else if (user.usdt_transaction) {
        transaction = { type: 'usdt_transaction', value: user.usdt_transaction, created_at: user.created_at };
      }
      // Remove raw transaction columns from output
      const { btc_transaction, eth_transaction, usdt_transaction, created_at, ...userData } = user;
      return { ...userData, transaction };
    });

    res.json(users);
  });
});

// Get users who are admin or call center
router.get('/users/admin-or-callcenter', adminOnly, (req, res) => {
  const sql = `
    SELECT 
      id, first_name, last_name, email, phone_number, user_name, is_admin, is_callcenter, user_refer_id, is_confirmation, created_at,
      country, state, city, province, zip, dob, homestatus, employmentstatus, householdincome, petstatus, feedback
    FROM users
    WHERE is_admin = 1 OR is_callcenter = 1
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json(results);
  });
});

// Update user by ID (admin only)
router.put('/user/:id', adminOnly, (req, res) => {
  const userId = req.params.id;
  const {
    first_name,
    last_name,
    email,
    phone_number,
    user_name,
    password,
    is_admin,
    is_callcenter,
    userReferId,
    country,
    state,
    city,
    province,
    zip,
    dob,
    homestatus,
    employmentstatus,
    householdincome,
    petstatus,
    feedback
  } = req.body;

  // Build dynamic query
  const fields = [];
  const values = [];

  if (first_name !== undefined) { fields.push('first_name = ?'); values.push(first_name); }
  if (last_name !== undefined) { fields.push('last_name = ?'); values.push(last_name); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (phone_number !== undefined) { fields.push('phone_number = ?'); values.push(phone_number); }
  if (user_name !== undefined) { fields.push('user_name = ?'); values.push(user_name); }
  if (password !== undefined) { fields.push('password = ?'); values.push(password); }
  if (is_admin !== undefined) { fields.push('is_admin = ?'); values.push(is_admin); }
  if (is_callcenter !== undefined) { fields.push('is_callcenter = ?'); values.push(is_callcenter); }
  if (userReferId !== undefined) { fields.push('user_refer_id = ?'); values.push(userReferId); }
  if (country !== undefined) { fields.push('country = ?'); values.push(country); }
  if (state !== undefined) { fields.push('state = ?'); values.push(state); }
  if (city !== undefined) { fields.push('city = ?'); values.push(city); }
  if (province !== undefined) { fields.push('province = ?'); values.push(province); }
  if (zip !== undefined) { fields.push('zip = ?'); values.push(zip); }
  if (dob !== undefined) { fields.push('dob = ?'); values.push(dob); }
  if (homestatus !== undefined) { fields.push('homestatus = ?'); values.push(homestatus); }
  if (employmentstatus !== undefined) { fields.push('employmentstatus = ?'); values.push(employmentstatus); }
  if (householdincome !== undefined) { fields.push('householdincome = ?'); values.push(householdincome); }
  if (petstatus !== undefined) { fields.push('petstatus = ?'); values.push(petstatus); }
  if (feedback !== undefined) { fields.push('feedback = ?'); values.push(feedback); }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  values.push(userId);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated successfully' });
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

// Create user API (admin only)
router.post('/users', adminOnly, (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    user_name,
    password,
    is_admin = 0,
    is_callcenter = 0,
    userReferId = null,
    country,
    state,
    city,
    province,
    zip,
    dob,
    homestatus,
    employmentstatus,
    householdincome,
    petstatus,
    feedback
  } = req.body;

  if (!first_name || !last_name || !email || !phone_number || !user_name || !password) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  db.query(
    `INSERT INTO users (
      first_name, last_name, email, phone_number, user_name, password, is_admin, is_callcenter, user_refer_id,
      country, state, city, province, zip, dob, homestatus, employmentstatus, householdincome, petstatus, feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      first_name, last_name, email, phone_number, user_name, password, is_admin, is_callcenter, userReferId,
      country, state, city, province, zip, dob, homestatus, employmentstatus, householdincome, petstatus, feedback
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      res.status(201).json({ message: 'User created successfully', userId: result.insertId });
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


// // Confirm user only if payment exists (admin only)
// router.put('/users/:id/confirm', adminOnly, (req, res) => {
//   const userId = req.params.id;

//   // Check if payment exists for this user
//   db.query('SELECT id FROM payment_transaction WHERE user_id = ?', [userId], (err, results) => {
//     if (err) return res.status(500).json({ message: 'Database error', error: err });

//     if (results.length === 0) {
//       return res.status(400).json({ message: 'No payment found for this user. Cannot confirm.' });
//     }

//     // Set is_confirmation = 1
//     db.query('UPDATE users SET is_confirmation = 1 WHERE id = ?', [userId], (err2, result) => {
//       if (err2) return res.status(500).json({ message: 'Database error', error: err2 });
//       if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
//       res.json({ message: 'User confirmed successfully.' });
//     });
//   });
// });

router.put('/users/:id/confirm', adminOnly, (req, res) => {
  const userId = req.params.id;

  // Check if payment exists for this user
  db.query('SELECT id FROM payment_transaction WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    // if (results.length === 0) {
    //   return res.status(400).json({ message: 'No payment found for this user. Cannot confirm.' });
    // }

    // Set is_confirmation = 1
    db.query('UPDATE users SET is_confirmation = 1 WHERE id = ?', [userId], (err2, result) => {
      if (err2) return res.status(500).json({ message: 'Database error', error: err2 });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

      // Get user info for email
      db.query('SELECT email, first_name, last_name FROM users WHERE id = ?', [userId], (err3, userResults) => {
        if (err3) return res.status(500).json({ message: 'Database error', error: err3 });
        if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });

        const { email, first_name, last_name } = userResults[0];

        // Prepare and send the verification email
        const msg = {
          to: email,
          from: `VIRON NETWORK <admin@viron.network>`,
          subject: `${first_name}, Your Payment is Now Verified!`,
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Verification - VIRON.NETWORK </title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px; background-color:#ffffff; font-family: Arial, sans-serif; color:#333333; line-height:1.6;">
    <tr>
      <td style="padding: 30px;">
        <div style="text-align: center; margin-bottom: 2rem;">
            <img src="https://viron.network/assets/img/viron-logo.png" alt="Viron Logo" style="max-width: 180px;" />
            <h2 style="color:#D00000; margin-top:5px;">NOTIFICATION</h2>
            <h2 style="color:#D00000; margin-bottom: 0px;">Your Payment is Now Verified…</h2>
            <p style="margin-top: 0px; color:#0000B3"><em>*Please review this message entirely for your familiarity.</em></p>
        </div>
        <p><strong>Hello&nbsp;${first_name} ${last_name},</strong></p>
        <p style="color:#D00000;">Your payment for your <strong><u>VIRON Home-Business (&ldquo;VHB&rdquo;)</u> </strong>has been <u>verified </u>successfully!</p>
        <p><strong style="color:#D00000;">NOTICE.</strong><br/>
        <abbr style="color:#D00000;">Systematically, the <strong>VIRON Administrators</strong> will now proceed to set up your <strong style="color:#0000B3"><u>SAVE CLUB (SC)</u></strong> account <u>correctly</u> under the VIRON umbrella.</abbr> <abbr style="color:#0000B3;">NOTE: This action with the qualified third-party MLM company is performed automatically for you. The amount of $300 will be deducted from our ESCROW account to pay for your SC account and position.</abbr> <abbr style="color:#D00000;">This action will complete your VIRON Home-Business. <strong style="background-color: yellow;"><u>*You will receive Email notifications from </u></strong><strong style="background-color: yellow;"><u style="color:#0000B3;">SAVE CLUB (SC)</u><u> directly.</u></strong></abbr></p>
        <ul style="background-color: yellow;">
            <li style="color: #D00000;"><strong><u>For your benefit, you will have immediate access to the </u><u style="color:#0000B3">SAVE CLUB (SC)</u></strong><strong><u> product</u></strong><strong>.</strong></li>
        </ul>
        <hr/>
        <p>*Again, <u>everything is professionally handled for you by VIRON</u>; Therefore, you do not need to review any of the SC newsletters, promotions, attend conferences/meetings, etc. <strong><u>You will only need to maintain your subscription with SC (annually) so that your account with SC stays active</u>.</strong></p>
        <p>NOTE: While VIRON will be monitoring all aspects of your business for you, including SC for any important action you may need to take, we invite you to do the same by <em>keeping an eye out for anything that may require your attention</em>. <strong>This will ensure that there are no interruptions to your business while VIRON builds your SC downline.</strong></p>
        <hr/>
        <p><strong>P.S.</strong><br/>
        Please also be aware that in your <strong>VIRON back-office / MEMBER CENTER</strong> / on the left <strong>DASHBOARD</strong> / under <strong>&ldquo;Your VIRON Home-Business (VHB) Account Status:&rdquo;</strong>&hellip;is now marked &ldquo;<strong style="color:green">Paid</strong>&rdquo;.</p>
        <p style="text-align: center; margin: 40px 0"><a href="https://viron.network/member//#/loginPage" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;" target="_blank">LOGIN to VIRON.NETWORK</a></p>
        <p style="text-align: center; padding-top: 10px"><strong><em>-The VIRON Administration</em></strong></p>  
    </td>
    </tr>
    <tr>
      <td style="background-color:#f5f5f5; text-align:center; padding:20px; font-size:12px; color:#777;">
        &copy; 2025 VIRON.NETWORK. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>`,
// Disable SendGrid's automatic click tracking
  trackingSettings: {
    clickTracking: {
      enable: false,
      enableText: false,
    },
  }
        };

        sgMail.send(msg)
          .then(() => res.json({ message: 'User confirmed successfully and email sent.' }))
          .catch(emailErr => res.json({ message: 'User confirmed, but email failed', error: emailErr.message }));
      });
    });
  });
});

router.put('/users/:id/editrefer', adminOnly, (req, res) => {
  const userId = req.params.id;
  const { userReferId } = req.body;

  if (!userReferId) {
    return res.status(400).json({ message: 'userReferId is required' });
  }

  db.query(
    'UPDATE users SET user_refer_id = ? WHERE id = ?',
    [userReferId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User refer updated successfully' });
    }
  );
});

// Admin: Update user_refer_id for a user
router.put('/users/:id/refer', adminOnly, (req, res) => {
  const userId = req.params.id;
  const { userReferId } = req.body;

  if (!userReferId) {
    return res.status(400).json({ message: 'userReferId is required' });
  }

  db.query(
    'UPDATE users SET ds_id = ? WHERE id = ?',
    [userReferId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

      // Get emails for both users
      db.query(
        'SELECT id, email, first_name, last_name, user_name FROM users WHERE id IN (?, ?)',
        [userId, userReferId],
        (err2, results) => {
          if (err2) return res.status(500).json({ message: 'Database error', error: err2 });
          if (results.length < 2) return res.status(404).json({ message: 'One or both users not found' });

          const userEmail = results.find(u => u.id == userId)?.email;
          const referEmail = results.find(u => u.id == userReferId)?.email;

          const userFirstName = results.find(u => u.id == userId)?.first_name;
          const userLastName = results.find(u => u.id == userId)?.last_name;
          const userUsername = results.find(u => u.id == userId)?.user_name;

          const referFirstName = results.find(u => u.id == userReferId)?.first_name;
          const referLastName = results.find(u => u.id == userReferId)?.last_name;
          const referUsername = results.find(u => u.id == userReferId)?.user_name;

          console.log({ userEmail, referEmail, userFirstName, referFirstName, userUsername, referUsername });


          const msgToUser = {
            to: userEmail,
            from: `VIRON NETWORK <admin@viron.network>`,
            subject: `${userFirstName}, Your DESIGNATED SPONSOR (DS) has been assigned.`,
            html: `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Designated Sponsor (DS) Assigned - VIRON.NETWORK</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px; background-color:#ffffff; font-family: Arial, sans-serif; color:#333333; line-height:1.6;">
    <tr>
      <td style="padding: 30px;">
        <h2 style="color:#D00000; text-align: center;">IMPORTANT NOTIFICATION</h2>
        <p style="text-align: center;"><strong>DESIGNATED SPONSOR (DS) ASSIGNED</strong><br/><em style="color:#D00000;">No action is necessary on your part.</em><br/><em style="color:#D00000;">Please review for your understanding.</em></p>
        <p>Hello ${userFirstName} ${userLastName},</p>
        <p>This notice is to affirm that your registration with VIRON.NETWORK is now complete, and the status of your <strong>VIRON Home-Business (&ldquo;VHB&rdquo;)</strong> is PAID.</p>
        <p>Further, your account with the qualified third-party MLM company: <strong>SAVE CLUB</strong> (&ldquo;<strong>SC</strong>&rdquo;), has been established, and your position with SC is <u>correctly</u> placed under the VIRON umbrella.&nbsp;</p>
        <p></p>
        <p><em style="color:#D00000;">*<strong>NOTE 1: </strong></em><em style="color:#0000B3;">Unless otherwise noted, for your convenience, your VIRON account profile, such as your <strong>username</strong>, <strong>password</strong>, and <strong>email</strong>, etc., <strong><u>is the same as your SC account profile</u>. </strong></em></p>
        <p><em style="color:#D00000;">*<strong>NOTE 2: </strong></em><em style="color:#0000B3;">You will receive Email messages and newsletters from SC&rsquo;s normal notifications. But as you may already be aware, you do not have to respond to any of them unless they pertain to actions required to maintain your SC account, or if they are actions you have triggered yourself. </em></p>
        <p></p>
        <p><em style="color:#D00000;">*<strong>NOTE 3: </strong><strong></em><em style="color:#0000B3;">For your additional convenience, on your behalf, the VIRON company monitors SC&rsquo;s notifications. If there is anything urgent or important that we feel you should be aware of, we will notify you accordingly via VIRON notifications.</strong> </em><span style="color:#D00000;">Please be aware that SC has sent you notices regarding your new account that VIRON has set up for you. You can access your SC account by logging in with the SC link accordingly (located within their &ldquo;Welcome Email&rdquo;).</span></p>
        <h3 style="text-align: center;">SYSTEM REMINDER 1:</h3>
        <p>VIRON is 100% Turn-Key and fully automated. Everything will be handled professionally and automatically for you.</p>
        <h3 style="text-align: center;">SYSTEM REMINDER 2:</h3>
        <p>VIRON systems level the playing field for every individual. *This means that every<strong> Direct Referral (DR)</strong> generated by VIRON will be placed and assigned to members like you.</p>
        <p style="color:#D00000; text-align: center;"><strong><u>Always use your VIRON Referral Link.</u></strong></p>
        <p>IMPORTANT: If you use your SC Referral Link to refer others, VIRON will not be aware of your DR, and your referrals will not have access to VIRON services. As a result, VIRON will not be able to build their SC downline the way we are building yours (keep in mind that your DR&rsquo;s downline is a part of your downline too). Therefore, <strong style="color:#D00000;"><u>always use your VIRON Referral Link.</u></strong> NOTE: When you refer anyone using your VIRON Referral Link, those DRs will automatically be placed under you within SC as well.</p>
    </td>
    </tr>
    <tr>
      <td style="padding: 30px; text-align: center;">
        <div style="border: 3px solid #D00000; padding: 30px; text-align: center;">
        <h2 style="color:#D00000;">IMPORTANT NOTIFICATION.</h2>
        <p style="color:#0000B3;">This is to notify you that you are now officially assigned to your VIRON:<br/><strong>DESIGNATED SPONSOR (&ldquo;DS&rdquo;).</strong></p>
        <p><strong>Your <span style="color:#0000B3;">DS’s</span> profile:</strong><br /></p>
        <p><strong>First Name: ${referFirstName}</strong><br/><strong>Last Name: ${referLastName}</strong><br/><strong>Email: ${referEmail}</strong></br><strong>VIRON Username: ${referUsername}</strong></p>
        <p style="color:#D00000;"><strong>Your account is now placed <u>correctly</u> within your DS downline.</strong></p>
        <p style="color:#0000B3;"><strong>Your DS is also notified of your account placement.</strong></p>
        <p>Since VIRON handles everything for you professionally, you do not need to contact your DS. However, please note that your DS is typically more aware of VIRON details because they have been involved with VIRON longer than you have. So, your DS can be considered your friend for additional support, and you can <u>optionally</u> contact them for that purpose. The choice is up to you.</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p>If you have any questions or need help, the best way to contact VIRON Member Support is via our CONTACT US page or via Email: <a href="mailto:Support@VIRON.NETWORK">Support@VIRON.NETWORK</a>. Our staff team will be happy to assist you during regular business hours.</p>
        <p style="text-align: center;"><em><strong>Welcome to the Evolution of Network Marketing!</strong></em></p> 
        <div style="text-align: center;">
            <a href="https://viron.network/member/loginPage" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">LOGIN TO VIRON.NETWORK</a>
        </div>
        <p><strong><em>-The VIRON Administration</em></strong></p>
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
  }
          };
          const msgToRefer = {
            to: referEmail,
            from: `VIRON NETWORK <admin@viron.network>`,
            subject: `${referFirstName}, Your VIRON Direct Referral (DR) is PLACED!`,
            html: `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Direct Referral (DR) PLACED - VIRON.NETWORK</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px; background-color:#ffffff; font-family: Arial, sans-serif; color:#333333; line-height:1.6;">
    <tr>
      <td style="padding: 30px;">
        <h2 style="color:#D00000; text-align: center;">IMPORTANT NOTIFICATION</h2>
        <p style="text-align: center;"><strong>Direct Referral (DR) PLACED</strong><br/><em style="color:#D00000;">No action is necessary on your part.</em><br/><em style="color:#D00000;">Please review for your understanding.</em></p>
    </td>
    </tr>
    <tr>
      <td style="padding: 30px; text-align: center;">
        <div style="border: 3px solid #D00000; padding: 30px; text-align: center;">
        <p style="color:#0000B3;">Hello ${referFirstName} ${referLastName},</p>
        <p style="color:#0000B3;">This is to notify you that your <strong>Direct Referral (DR)</strong> has been placed into your Account and Downline.</p>
        <p><strong>Your <span style="color:#0000B3;">DR’s</span> profile:</strong><br /></p>
        <p><strong>First Name: ${userFirstName}</strong><br/><strong>Last Name: ${userLastName}</strong><br/><strong>Email: ${userEmail}</strong></br><strong>VIRON Username: ${userUsername}</strong></p>
        <p style="color:#D00000;"><strong>You are now the &ldquo;DESIGNATED SPONSOR&rdquo; (DS) of the above DR.</strong></p>
        <p style="color:#0000B3;"><strong>Your DR is also notified of their account placement under you.</strong></p>
        <p style="color:#D00000;"><strong>SYSTEM REMINDER: </strong></p>
        <p style="color:#D00000;">As a VIRON Member <strong><em>(unless you have used your VIRON Referral Link and have referred the DR yourself)</em></strong>, you hereby acknowledge that all DRs generated by VIRON are <strong><u>VIRON Registered Members</u></strong>. Therefore, said DR, is not a <em>&ldquo;property&rdquo;</em> of yours or anyone else&rsquo;s. You are simply <em>&ldquo;leasing&rdquo;</em> the best features of the DR by benefiting from the commission(s) and income stream from the paid DR. Further, the DR qualifies you for higher income from the third-party MLM company.</p>
        <p>Since VIRON handles everything for you, it is unnecessary to contact your DR. The VIRON system will do all of that for you, and of course, your DR can contact VIRON&rsquo;s Member Support at any time for anything they need. But perhaps you can optionally contact them to say &ldquo;hello&rdquo; and welcome them to your <strong>VIRON Home-Business (VHB)</strong>.</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="text-align: center;"><strong>SYSTEM REMINDERS:</strong></p>
        <p>VIRON is 100% Turn-Key and fully automated. Everything will be handled professionally and automatically for you. VIRON systems level the playing field for every individual. *This means that every<strong> Direct Referral (DR)</strong> generated by VIRON will be placed and assigned to members like you.</p>
        <p style="color:#D00000; text-align: center;"><strong><u>Always use your VIRON Referral Link.</u></strong></p>
        <p>IMPORTANT: If you use your SC Referral Link to refer others, VIRON will not be aware of your DR, and your referrals will not have access to VIRON services. As a result, VIRON will not be able to build their SC downline the way we are building yours (keep in mind that your DR&rsquo;s downline is a part of your downline too). Therefore, <strong style="color:#D00000;"><u>always use your VIRON Referral Link.</u></strong> NOTE: When you refer anyone using your VIRON Referral Link, those DRs will automatically be placed under you within SC as well.</p>
        <p>If you have any questions or need help, the best way to contact VIRON Member Support is via our CONTACT US page or via Email: <a href="mailto:Support@VIRON.NETWORK">Support@VIRON.NETWORK</a>. Our staff team will be happy to assist you during regular business hours.</p>
        <p style="text-align: center;"><em><strong>Welcome to the Evolution of Network Marketing!</strong></em></p>
        <div style="text-align: center;">
            <a href="https://viron.network/member/loginPage" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">LOGIN TO VIRON.NETWORK</a>
        </div>
        <p><strong><em>-The VIRON Administration</em></strong></p>
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
  }
          };
          // console.log("msgToUser is :", msgToUser)
          // console.log("msgToRefer is :", msgToRefer)

          Promise.all([sgMail.send(msgToUser), sgMail.send(msgToRefer)])
            .then(() => res.json({ message: 'User refer updated and emails sent successfully' }))
            .catch(emailErr => res.status(200).json({ message: 'User refer updated, but email failed', error: emailErr.message }));
        });
    }
  );
});

router.delete('/users/:id', adminOnly, (req, res) => {
  const userId = req.params.id;

  db.query(
    'DELETE FROM users WHERE id = ?',
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User has been deleted' });
    }
  );
});

// ...existing code...

module.exports = router;