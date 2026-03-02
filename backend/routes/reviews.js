const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const os = require('os');

// Multer Config
const { storage: cloudStorage } = require('../config/cloudinary');
let upload;

if (process.env.CLOUDINARY_CLOUD_NAME) {
    upload = multer({ storage: cloudStorage });
} else {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, os.tmpdir()),
        filename: (req, file, cb) => cb(null, 'review-' + Date.now() + path.extname(file.originalname))
    });
    upload = multer({ storage });
}

// Add a Review
router.post('/add', auth(['buyer', 'admin']), upload.array('images', 5), async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user.id;

        const imageUrls = req.files ? req.files.map(file => {
            if (file.path && file.path.startsWith('http')) return file.path;
            return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        }) : [];

        // Create Review
        const newReview = new Review({
            productId,
            userId,
            rating: Number(rating),
            comment,
            imageUrls
        });
        await newReview.save();

        // Update Product Rating & Reviews Count
        const reviews = await Review.find({ productId });
        const avgRating = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;

        await Product.findByIdAndUpdate(productId, {
            rating: avgRating.toFixed(1),
            reviewsCount: reviews.length
        });

        res.status(201).json(newReview);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add review' });
    }
});

// Get Reviews for a Product
router.get('/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.productId })
            .populate('userId', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

module.exports = router;
