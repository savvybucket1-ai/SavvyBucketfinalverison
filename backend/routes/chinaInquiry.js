const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/sendEmail');

router.post('/inquiry', async (req, res) => {
    try {
        const { name, email, phone, company, quantity, message, productId, productTitle } = req.body;

        if (!name || !email || !phone || !quantity) {
            return res.status(400).json({ error: 'Please provide all required fields (Name, Email, Phone, Quantity).' });
        }

        const subject = `New China Shipping Inquiry: ${productTitle}`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">New Global Inquiry (Ship from China)</h2>
                <p style="font-size: 16px;">You have received a new inquiry for <strong>${productTitle}</strong> (ID: ${productId}).</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p><strong>Customer Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Company:</strong> ${company || 'N/A'}</p>
                    <p><strong>Requested Quantity:</strong> ${quantity}</p>
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">${message || 'No message provided.'}</p>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">This inquiry was sent from the SavvyBucket Ship from China page.</p>
            </div>
        `;

        await sendEmail({
            email: 'savvybucket1@gmail.com',
            subject: subject,
            message: `New Inquiry from ${name} for ${productTitle}`,
            html: html
        });

        res.status(200).json({ message: 'Inquiry sent successfully. Our team will contact you soon.' });
    } catch (err) {
        console.error('Error sending inquiry email:', err);
        res.status(500).json({ error: 'Failed to send inquiry. Please try again later.' });
    }
});

module.exports = router;
