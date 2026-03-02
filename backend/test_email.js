const nodemailer = require('nodemailer');
require('dotenv').config();

const sendTestEmail = async () => {
    console.log('Testing email configuration...');
    console.log(`User: ${process.env.SMTP_EMAIL}`);
    // Obscure password for log
    const pass = process.env.SMTP_PASSWORD ? '******' : 'MISSING';
    console.log(`Pass: ${pass}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const message = {
        from: process.env.SMTP_EMAIL,
        to: process.env.SMTP_EMAIL, // Send to self
        subject: 'Test Email from SavvyBucket',
        text: 'If you see this, email sending is working!'
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('SUCCESS: Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('FAILURE: Email could not be sent.');
        console.error('Error Code:', error.code);
        console.error('Error Command:', error.command);
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('Error Response:', error.response);
        }
    }
};

sendTestEmail();
