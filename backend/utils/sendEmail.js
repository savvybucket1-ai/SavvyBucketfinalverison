const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // robust fallback if env vars are missing
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.log('--- EMAIL SIMULATION ---');
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message}`);
        console.log('------------------------');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const message = {
        from: `SavvyBucket <${process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html // Add HTML support
    };

    try {
        const info = await transporter.sendMail(message);
        console.log(`Email sent to: ${options.email}`);
        console.log('Message ID: %s', info.messageId);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${options.email}:`, error);
        throw error;
    }
};

module.exports = sendEmail;
