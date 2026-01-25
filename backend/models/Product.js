const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    hsnCode: { type: String, required: true, minlength: 6 },
    gstPercentage: { type: Number, required: true },
    sellerPrice: { type: Number },
    adminPrice: { type: Number },
    commission: { type: Number, default: 0 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    moq: { type: Number, default: 1 },
    stock: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    weight: { type: Number },
    dimensions: {
        length: { type: Number },
        breadth: { type: Number },
        height: { type: Number }
    },
    imageUrls: [{ type: String }],
    variations: [{
        name: { type: String },
        values: [{ type: String }]
    }],
    tieredPricing: [{
        moq: { type: Number, required: true },
        price: { type: Number, required: true },
        length: { type: Number },
        breadth: { type: Number },
        height: { type: Number },
        weight: { type: Number }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
