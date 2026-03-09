const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
    isBlocked: { type: Boolean, default: false },
    resetPasswordOtp: { type: String },
    resetPasswordExpires: { type: Date },
    countryCode: { type: String, default: '+91' },
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    verificationOtpExpires: { type: Date },

    // Seller Specific Fields
    gstNumber: { type: String },
    gstDocument: { type: String },
    panDocument: { type: String },
    aadharDocument: { type: String },
    cancelledCheck: { type: String },
    pickupAddress: { type: String }, // legacy flat string (kept for backward compat)
    shiprocketNickname: { type: String }, // Pickup location nickname registered in ShipRocket
    // Structured pickup address for ShipRocket registration
    pickupAddressDetails: {
        locationName: { type: String },  // Unique nickname e.g. "Delhi Warehouse"
        name: { type: String },          // Contact person name
        phone: { type: String },
        address: { type: String },
        address2: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        isRegisteredWithShiprocket: { type: Boolean, default: false }
    },
    bankDetails: {
        accountNumber: { type: String },
        accountName: { type: String },
        ifscCode: { type: String }
    },
    isSellerApproved: { type: Boolean, default: false },

    // Buyer Specific Fields
    shippingAddress: {
        fullName: { type: String },
        addressLine1: { type: String },
        addressLine2: { type: String },
        city: { type: String },
        state: { type: String },
        pinCode: { type: String },
        phone: { type: String },
        alternatePhone: { type: String },
        addressType: { type: String },
        landmark: { type: String },
        country: { type: String }
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
