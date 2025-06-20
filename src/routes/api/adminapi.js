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
      p.btc_transaction, p.eth_transaction, p.usdt_transaction, p.created_at 
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
                transaction = { type: 'btc_transaction', value: user.btc_transaction, created_at: user.created_at };    
            } else if (user.eth_transaction) {
                transaction = { type: 'eth_transaction', value: user.eth_transaction ,created_at: user.created_at};
            } else if (user.usdt_transaction) {     
                transaction = { type: 'usdt_transaction', value: user.usdt_transaction ,created_at: user.created_at};
            }
            // Remove raw transaction columns from output
            const { btc_transaction, eth_transaction, usdt_transaction, created_at,...userData } = user;
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


// Admin: Update user_refer_id for a user
router.put('/users/:id/refer', adminOnly, (req, res) => {
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
                    from: "admin@viron.network",
                    subject: "Your referral has been updated",
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
            <a href="login.html" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">LOGIN TO VIRON.NETWORK</a>
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

  `
                };
                const msgToRefer = {
                    to: referEmail,
                    from: "admin@viron.network",
                    subject: "You have a new referral",
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
        <p><strong>Your <span style="color:#0000B3;">DS’s</span> profile:</strong><br /></p>
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
            <a href="login.html" style="display: inline-block; padding: 12px 24px; background-color: #D00000; color: #ffffff; text-decoration: none; border-radius: 4px;">LOGIN TO VIRON.NETWORK</a>
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

  `
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

// ...existing code...

module.exports = router;