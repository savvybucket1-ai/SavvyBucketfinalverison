const mongoose = require('mongoose');

const influencerVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String }, // Optional, could automatically generate or upload separately
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('InfluencerVideo', influencerVideoSchema);
