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

        const adminExists = await User.findOne({ email: 'admin@savvybucket.com' });
        if (adminExists) {
            console.log('Admin user already exists');
        } else {
            const admin = new User({
                name: 'Super Admin',
                email: 'admin@savvybucket.com',
                password: 'admin',
                role: 'admin'
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
