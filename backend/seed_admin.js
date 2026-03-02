const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI is missing from .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@savvybucket12.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin12';

        const adminExists = await User.findOne({ email: adminEmail });
        if (adminExists) {
            console.log('Admin user already exists. Updating verification status...');
            adminExists.isVerified = true;
            adminExists.role = 'admin'; // Ensure role is correct
            await adminExists.save();
            console.log('Admin user updated.');
        } else {
            const admin = new User({
                name: 'Super Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                isVerified: true
            });

            await admin.save();
            console.log('Admin user created successfully');
        }
    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        mongoose.disconnect();
    }
};

createAdmin();
