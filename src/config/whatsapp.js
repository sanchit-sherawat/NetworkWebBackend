const axios = require('axios');

// After inserting into DB
const WA_ACCESS_TOKEN = 'AAHn-2yHcP78wg1-QMHvcQRtjXuK3XX1hkQ';
const PHONE_NUMBER_ID = '706018122592521';


function validatePhoneNumber(phoneNumber) {

    const waPayload = {
        messaging_product: 'whatsapp',
        to: '+91'+`${phoneNumber}`, // e.g., '+919876543210'
        type: 'template',
        template: {
            name: 'hello_world', // Use your approved template name
            language: { code: 'en_US' }
        }
    };

    axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, waPayload, {
        headers: {
            'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    })
        .then(() => {
            console.log('✅ WhatsApp message sent');
            res.status(201).json({ message: 'User registered and WhatsApp message sent!' });
        })
        .catch((err) => {
            console.error('❌ WhatsApp send error:', err.response?.data || err.message);
            res.status(500).json({ message: 'User registered but WhatsApp message failed', error: err });
        });
}
module.exports = validatePhoneNumber;