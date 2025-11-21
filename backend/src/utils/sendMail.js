const nodemailer = require('nodemailer');
const asyncHandler = require('express-async-handler');
require('dotenv').config();

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

const sendMail = asyncHandler(async (email, content) => {
    if (!email || !content || !content.subject || !content.html) {
        throw new Error('Email, subject, and HTML content are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }

    try {
        const info = await transporter.sendMail({
            from: '"Tikovia " <no-reply@tikoviadev.com>',
            to: email, // List of receivers
            subject: content.subject,
            html: content.html,
            text: content.text,
        });
        console.log('Message sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('Error sending email:', err);
        throw new Error('Failed to send email');
    }
});

module.exports = sendMail;
