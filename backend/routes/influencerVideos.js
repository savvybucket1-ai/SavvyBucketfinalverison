const express = require('express');
const InfluencerVideo = require('../models/InfluencerVideo');
const Product = require('../models/Product'); // Ensure product exists
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const os = require('os');
const router = express.Router();

// Multer Config
const { videoStorage: cloudVideoStorage } = require('../config/cloudinary');
let upload;

if (process.env.CLOUDINARY_CLOUD_NAME) {
    upload = multer({ storage: cloudVideoStorage });
} else {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, os.tmpdir()),
        filename: (req, file, cb) => cb(null, 'vid_' + Date.now() + path.extname(file.originalname))
    });
    upload = multer({ storage });
}

// Admin: Upload Video
router.post('/upload', auth(['admin']), upload.single('video'), async (req, res) => {
    try {
        const { title, productId } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const videoUrl = (req.file.path && req.file.path.startsWith('http'))
            ? req.file.path
            : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // For simplicity, we are not generating a thumbnail here. 
        // In a real app, use ffmpeg or ask user to upload one.
        // We will just use a placeholder or product image if available.
        const thumbnailUrl = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';

        const newVideo = new InfluencerVideo({
            title,
            videoUrl,
            thumbnailUrl,
            productId,
            isActive: true
        });

        await newVideo.save();
        res.status(201).json(newVideo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Calculate Total Revenue from video linked products
// This is an advanced feature but good for "Top Picks" analytics if needed.
// For now, just CRUD.

// Public: Get List of Active Videos
router.get('/list', async (req, res) => {
    try {
        const videos = await InfluencerVideo.find({ isActive: true }).populate('productId');
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete Video
router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        await InfluencerVideo.findByIdAndDelete(req.params.id);
        res.json({ message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
