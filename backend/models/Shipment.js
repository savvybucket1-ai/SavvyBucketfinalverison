const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shiprocketOrderId: { type: String },
    shipmentId: { type: String },
    awbCode: { type: String },
    courierName: { type: String },
    courierId: { type: String },
    status: { type: String, default: 'Draft' }, // Draft, Placed, AWB Assigned, Pickup Scheduled, Shipped, Delivered, Canceled
    labelUrl: { type: String },
    manifestUrl: { type: String },
    pickupScheduledDate: { type: Date },
    trackingHistory: [
        {
            status: String,
            location: String,
            date: Date,
            activity: String
        }
    ],
    // Dimensions used for this shipment
    weight: { type: Number },
    length: { type: Number },
    breadth: { type: Number },
    height: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
