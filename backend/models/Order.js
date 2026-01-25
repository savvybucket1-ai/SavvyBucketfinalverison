const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true },
    adminCommission: { type: Number, required: true },
    sellerEarning: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    orderStatus: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
    logisticsStatus: { type: String, enum: ['pending', 'dispatched', 'in-transit', 'delivered'], default: 'pending' },
    routingNotes: { type: String },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
