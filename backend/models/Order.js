const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    selectedVariation: { type: Map, of: String },
    totalAmount: { type: Number, required: true },
    adminCommission: { type: Number, required: true },
    sellerEarning: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    orderStatus: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
    logisticsStatus: { type: String, enum: ['pending', 'ready-to-ship', 'awb-assigned', 'pickup-scheduled', 'manifest-generated', 'shipped', 'in-transit', 'delivered', 'rto', 'cancelled'], default: 'pending' },
    routingNotes: { type: String },
    stripeSessionId: { type: String },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    easebuzzTransactionId: { type: String },
    paymentGateway: { type: String, enum: ['stripe', 'easebuzz'], default: 'easebuzz' },
    sellerPayoutStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    shippingAddress: {
        fullName: { type: String },
        addressLine1: { type: String },
        addressLine2: { type: String },
        city: { type: String },
        state: { type: String },
        pinCode: { type: String },
        phone: { type: String },
        alternatePhone: { type: String },
        addressType: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
        landmark: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
