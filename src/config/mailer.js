// const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({
//   service: 'SendGrid',
//   auth: {
//     user: 'apikey',
//     pass: '
// });
// module.exports = transporter;
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('');
module.exports = sgMail;