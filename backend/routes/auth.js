const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const os = require('os'); // Import os module
const router = express.Router();

// Multer Config
const { docStorage: cloudDocStorage } = require('../config/cloudinary');
let upload;

console.log('Auth Route Init: CLOUDINARY_CLOUD_NAME is', process.env.CLOUDINARY_CLOUD_NAME ? 'PRESENT' : 'MISSING');

if (process.env.CLOUDINARY_CLOUD_NAME) {
    upload = multer({ storage: cloudDocStorage });
} else {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, os.tmpdir()),
        filename: (req, file, cb) => cb(null, 'doc-' + Date.now() + path.extname(file.originalname))
    });
    upload = multer({ storage });
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (buyer or seller)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [buyer, seller]
 *               gstNumber:
 *                 type: string
 *               gstDocument:
 *                 type: string
 *                 format: binary
 *               panDocument:
 *                 type: string
 *                 format: binary
 *               aadharDocument:
 *                 type: string
 *                 format: binary
 *               cancelledCheck:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/register', upload.fields([
    { name: 'gstDocument', maxCount: 1 },
    { name: 'panDocument', maxCount: 1 },
    { name: 'aadharDocument', maxCount: 1 },
    { name: 'cancelledCheck', maxCount: 1 }
]), async (req, res) => {
    try {
        let { name, email, phone, countryCode, password, role, gstNumber, pickupAddress, bankAccountNumber, bankAccountName, bankIfscCode } = req.body;

        // Sanitize inputs
        email = email ? email.trim().toLowerCase() : '';
        phone = phone ? phone.trim() : undefined;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            if (!existingUser.isVerified) {
                // Resend OTP if user exists but not verified
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                existingUser.verificationOtp = otp;
                existingUser.verificationOtpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
                if (name) existingUser.name = name;
                if (password) existingUser.password = password; // Will be re-hashed on save
                if (countryCode) existingUser.countryCode = countryCode;

                await existingUser.save();

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #333; text-align: center;">Verify Your Account</h2>
                        <p style="font-size: 16px; color: #555;">Hello,</p>
                        <p style="font-size: 16px; color: #555;">Please use the following OTP to verify your email address:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for 10 minutes.</p>
                    </div>
                `;

                try {
                    await sendEmail({
                        email: existingUser.email,
                        subject: 'Verify your Account - SavvyBucket',
                        message: `Your verification OTP is ${otp}. Valid for 10 minutes.`,
                        html: emailHtml
                    });
                    return res.status(200).json({ message: 'User exists but unverified. New OTP sent to email', requireOtp: true, email: existingUser.email });
                } catch (emailErr) {
                    console.error("Resend Email failed", emailErr);
                    return res.status(500).json({ error: 'Failed to send OTP email' });
                }
            }
            return res.status(400).json({ error: 'Email or Phone number already registered' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const userData = {
            name,
            email,
            phone,
            countryCode: countryCode || '+91',
            password,
            role: role || 'buyer',
            verificationOtp: otp,
            verificationOtpExpires: Date.now() + 10 * 60 * 1000,
            isVerified: false
        };

        if (role === 'seller') {
            userData.isSellerApproved = false; // Sellers need approval
            userData.gstNumber = gstNumber;
            userData.pickupAddress = pickupAddress;
            userData.bankDetails = {
                accountNumber: bankAccountNumber,
                accountName: bankAccountName,
                ifscCode: bankIfscCode
            };

            if (req.files) {
                const getUrl = (field) => {
                    const f = req.files[field]?.[0];
                    if (!f) return undefined;
                    return (f.path && f.path.startsWith('http')) ? f.path : `${req.protocol}://${req.get('host')}/uploads/${f.filename}`;
                };
                userData.gstDocument = getUrl('gstDocument');
                userData.panDocument = getUrl('panDocument');
                userData.aadharDocument = getUrl('aadharDocument');
                userData.cancelledCheck = getUrl('cancelledCheck');
            }
        } else {
            userData.isSellerApproved = true; // Buyers are auto-approved
            // Optional GST for Buyers
            if (gstNumber) userData.gstNumber = gstNumber;
        }

        const user = new User(userData);
        await user.save();

        let emailSent = false;
        try {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Welcome to SavvyBucket!</h2>
                    <p style="font-size: 16px; color: #555;">Hello ${user.name},</p>
                    <p style="font-size: 16px; color: #555;">Thank you for registering. Please use the following OTP to verify your email:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">${otp}</span>
                    </div>
                </div>
            `;

            // Attempt to send email with 8s timeout
            const emailPromise = sendEmail({
                email: user.email,
                subject: 'Verify your Account - SavvyBucket',
                message: `Your verification OTP is ${otp}. Valid for 10 minutes.`,
                html: emailHtml
            });

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 8000));

            await Promise.race([emailPromise, timeoutPromise]);
            emailSent = true;
        } catch (emailErr) {
            console.error("Failed to send OTP email:", emailErr.message);
            // Non-blocking: We proceed even if email fails
        }

        // Return success even if email failed (return debugOtp to help user)
        res.status(201).json({
            message: emailSent ? 'User registered successfully. OTP sent to email.' : 'User created. Email delivery delayed/failed.',
            requireOtp: true,
            email: user.email,
            // SECURITY WARNING: In production, remove this. For debugging network issues:
            debugOtp: !emailSent ? otp : undefined
        });


    } catch (err) {
        console.error("Register Error:", err);
        res.status(400).json({ error: err.message });
    }
});

router.post('/resend-verification-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationOtp = otp;
        user.verificationOtpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Verify Your Account</h2>
                <p style="font-size: 16px; color: #555;">Hello ${user.name || 'User'},</p>
                <p style="font-size: 16px; color: #555;">Here is your new verification OTP:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for 10 minutes.</p>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: 'New Verification OTP - SavvyBucket',
            message: `Your new verification OTP is ${otp}.`,
            html: emailHtml
        });

        res.json({ message: 'OTP resent successfully' });

    } catch (err) {
        console.error("Resend OTP Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/verify-email-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({
            email,
            verificationOtp: otp,
            verificationOtpExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.verificationOtp = undefined;
        user.verificationOtpExpires = undefined;
        await user.save();

        // Don't log them in immediately if they are an unapproved seller
        if (user.role === 'seller' && !user.isSellerApproved) {
            return res.json({ message: 'Verification Successful! Your account is pending Admin Approval.', requireApproval: true });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Verification Successful', token, user: { id: user._id, name: user.name, role: user.role, email: user.email, phone: user.phone } });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email or phone number
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [buyer, seller, admin]
 *                 description: Optional role verification
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Access denied (blocked, unverified, or wrong role)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({
            $or: [
                { email: email },
                { phone: email }
            ]
        });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Validate Role (Prevent Buyer from logging into Seller Portal and vice versa)
        if (req.body.role && user.role !== req.body.role) {
            return res.status(403).json({ message: `Access Denied: You cannot login to the ${req.body.role} portal with a ${user.role} account.` });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account has been blocked by the admin.' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Account not verified. Please verify your email.', requireVerification: true, email: user.email });
        }

        // Check Seller Approval
        if (user.role === 'seller' && !user.isSellerApproved) {
            return res.status(403).json({ message: 'Your account is currently under review by the Admin. You will be notified once approved.' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email, phone: user.phone } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found. Please create a new account.' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP and expiry (10 minutes)
        user.resetPasswordOtp = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        const message = `Your password reset OTP is ${otp}. It is valid for 10 minutes.`;

        try {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                    <p style="font-size: 16px; color: #555;">Hello ${user.name || 'User'},</p>
                    <p style="font-size: 16px; color: #555;">You requested a password reset. Please use the following OTP to proceed:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #FF5722; letter-spacing: 5px;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for 10 minutes.</p>
                    <p style="font-size: 12px; color: #999; text-align: center;">If you didn't request this, please secure your account.</p>
                </div>
            `;

            await sendEmail({
                email: user.email,
                subject: 'Password Reset OTP - SavvyBucket',
                message,
                html: emailHtml
            });

            res.status(200).json({ message: 'OTP sent to email' });
        } catch (err) {
            user.resetPasswordOtp = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.status(200).json({ message: 'OTP Verified' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const user = await User.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.password = password; // Will be hashed by pre-save hook
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

router.get('/sellers', auth(['admin']), async (req, res) => {
    try {
        const sellers = await User.find({ role: 'seller' }).select('-password');

        // Enrich sellers with stats
        const enrichedSellers = await Promise.all(sellers.map(async (seller) => {
            const productCount = await Product.countDocuments({ sellerId: seller._id });
            const orders = await Order.find({
                productId: { $in: await Product.find({ sellerId: seller._id }).select('_id') }
            });
            const totalEarnings = orders.reduce((sum, order) => sum + (order.sellerEarning || 0), 0);

            return {
                ...seller._doc,
                productCount,
                totalEarnings
            };
        }));

        res.json(enrichedSellers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Retrieve pending sellers
router.get('/admin/pending-sellers', auth(['admin']), async (req, res) => {
    try {
        const pendingSellers = await User.find({ role: 'seller', isSellerApproved: false, isVerified: true }).select('-password');
        res.json(pendingSellers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Approve Seller
router.patch('/admin/approve-seller/:id', auth(['admin']), async (req, res) => {
    try {
        const seller = await User.findByIdAndUpdate(req.params.id, { isSellerApproved: true }, { new: true });
        if (!seller) return res.status(404).json({ message: 'Seller not found' });

        // Send Approval Email to Seller
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const sellerLoginUrl = `${frontendUrl}/seller/login`;
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #1e293b; margin: 0; font-size: 24px;">SavvyBucket</h1>
                </div>
                <p style="font-size: 16px; color: #334155; margin-bottom: 10px;">Dear <strong>${seller.name}</strong>,</p>
                <p style="font-size: 16px; color: #334155;">Congratulations! 🎉</p>
                <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                    Your seller account on <strong>Savvybucket</strong> has been successfully approved. You can now log in to your seller dashboard and start listing your products.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${sellerLoginUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                        Login to Seller Panel
                    </a>
                </div>
                <p style="font-size: 13px; color: #64748b; text-align: center;">
                    Or copy and paste this link in your browser:<br/>
                    <a href="${sellerLoginUrl}" style="color: #3b82f6;">${sellerLoginUrl}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 14px; color: #64748b;">If you need any help, feel free to contact our support team.</p>
                <p style="font-size: 14px; color: #334155; margin-top: 20px;">
                    Best regards,<br/>
                    <strong>Savvybucket Team</strong>
                </p>
            </div>
        `;

        try {
            await sendEmail({
                email: seller.email,
                subject: '🎉 Your Seller Account is Approved - SavvyBucket',
                message: `Congratulations ${seller.name}! Your seller account has been approved. Login at: ${sellerLoginUrl}`,
                html: emailHtml
            });
        } catch (emailErr) {
            console.error('Approval email failed to send:', emailErr);
            // Don't block the approval even if email fails
        }

        res.json({ message: 'Seller approved successfully', seller });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Reject Seller Registration
router.delete('/admin/reject-seller/:id', auth(['admin']), async (req, res) => {
    try {
        const seller = await User.findById(req.params.id);
        if (!seller) return res.status(404).json({ message: 'Seller not found' });

        const sellerName = seller.name;
        const sellerEmail = seller.email;

        // Send Rejection Email to Seller
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #1e293b; margin: 0; font-size: 24px;">SavvyBucket</h1>
                </div>
                <p style="font-size: 16px; color: #334155; margin-bottom: 10px;">Dear <strong>${sellerName}</strong>,</p>
                <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                    We regret to inform you that your seller portal registration request has been <strong style="color: #dc2626;">rejected</strong> due to inability to verify the documents submitted.
                </p>
                <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                    If you have any queries or believe this was done in error, please feel free to contact our support team.
                </p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="font-size: 14px; color: #475569; margin: 0 0 10px 0;"><strong>Contact Support:</strong></p>
                    <p style="font-size: 14px; color: #334155; margin: 5px 0;">📧 Email: support@savvybucket.com</p>
                    <p style="font-size: 14px; color: #334155; margin: 5px 0;">📞 Phone: +91 9876543210</p>
                </div>
                <p style="font-size: 14px; color: #64748b;">Thank you for your interest in SavvyBucket.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 14px; color: #334155; margin-top: 20px;">
                    Best regards,<br/>
                    <strong>SavvyBucket Team</strong>
                </p>
            </div>
        `;

        try {
            await sendEmail({
                email: sellerEmail,
                subject: 'Seller Registration Update - SavvyBucket',
                message: `Dear ${sellerName}, Your seller portal registration request has been rejected due to inability to verify the documents. Please contact support for any queries.`,
                html: emailHtml
            });
        } catch (emailErr) {
            console.error('Rejection email failed to send:', emailErr);
            // Continue with deletion even if email fails
        }

        // Delete the seller from database
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'Seller rejected and removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Toggle Seller Block status
router.patch('/sellers/toggle-block/:id', auth(['admin']), async (req, res) => {
    try {
        const seller = await User.findById(req.params.id);
        if (!seller || seller.role !== 'seller') {
            return res.status(404).json({ message: 'Seller not found' });
        }

        seller.isBlocked = !seller.isBlocked;
        await seller.save();

        // Update all seller's products availability
        // If blocked, hide products (isAvailable: false)
        // If unblocked, show products (isAvailable: true)
        await Product.updateMany(
            { sellerId: seller._id },
            { isAvailable: !seller.isBlocked }
        );

        res.json({ message: `Seller ${seller.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: seller.isBlocked });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Current User Profile
router.get('/profile', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Current User Profile
router.put('/profile', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    try {
        const { name, phone, pickupAddress, shiprocketNickname, bankDetails, gstNumber } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (pickupAddress) user.pickupAddress = pickupAddress;
        if (shiprocketNickname) user.shiprocketNickname = shiprocketNickname;
        if (gstNumber) user.gstNumber = gstNumber;
        if (bankDetails) user.bankDetails = { ...user.bankDetails, ...bankDetails };

        await user.save();
        res.json({ message: 'Profile updated successfully', user: { id: user._id, name: user.name, role: user.role, email: user.email, phone: user.phone, pickupAddress: user.pickupAddress, shiprocketNickname: user.shiprocketNickname } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/seed-admin', async (req, res) => {
    try {
        const adminEmail = 'admin@savvybucket12.com';
        const adminPassword = 'admin12';

        let admin = await User.findOne({ email: adminEmail });
        if (admin) {
            admin.role = 'admin';
            admin.isVerified = true;
            await admin.save();
            return res.json({ message: 'Admin exists. Updated to verified/admin.', email: adminEmail });
        }

        admin = new User({
            name: 'Super Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            isVerified: true,
            isSellerApproved: true
        });
        await admin.save();
        res.json({ message: 'Admin created successfully', email: adminEmail, password: adminPassword });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

