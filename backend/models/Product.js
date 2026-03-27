const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String }, // New field for sub-categorization
    hsnCode: {
        type: String,
        required: function () { return !this.shipFromChina; },
        validate: {
            validator: function (v) {
                if (this.shipFromChina) return true;
                return v && v.length >= 6;
            },
            message: props => `${props.value} is not a valid HSN code! Must be at least 6 characters.`
        }
    },
    gstPercentage: {
        type: Number,
        required: function () { return !this.shipFromChina; }
    },
    sellerPrice: { type: Number },
    adminPrice: {
        IN: { type: Number },   // India
        US: { type: Number },   // United States
        UK: { type: Number },   // United Kingdom
        CA: { type: Number },   // Canada
        AU: { type: Number },   // Australia
        UAE: { type: Number }, // UAE 
    },
    commission: { type: Number, default: 0 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    moq: { type: Number, default: 1 },
    stock: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    isTrending: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
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
    }],
    shipFromChina: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
