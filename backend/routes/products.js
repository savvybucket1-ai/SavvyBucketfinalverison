const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Seller: Add product (Multi-image upload)
router.post('/seller/add', auth(['seller']), upload.array('images', 10), async (req, res) => {
    try {
        let { title, description, sellerPrice, moq, stock, category, hsnCode, gstPercentage, weight, length, breadth, height, variations, tieredPricing } = req.body;

        if (typeof variations === 'string') {
            try { variations = JSON.parse(variations); } catch (e) { variations = []; }
        }
        if (typeof tieredPricing === 'string') {
            try { tieredPricing = JSON.parse(tieredPricing); } catch (e) { tieredPricing = []; }
        }

        // Validate HSN code is at least 6 digits
        if (!hsnCode || hsnCode.length < 6) {
            return res.status(400).json({ error: 'HSN Code must be at least 6 digits' });
        }

        const imageUrls = req.files.map(file => `http://localhost:5000/uploads/${file.filename}`);

        const product = new Product({
            title, description, sellerPrice, imageUrls, moq, stock,
            category, hsnCode, gstPercentage,
            weight,
            weight,
            dimensions: { length, breadth, height },
            variations,
            tieredPricing,
            sellerId: req.user.id,
            status: 'pending'
        });
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Seller: View their products
router.get('/seller/list', auth(['seller']), async (req, res) => {
    try {
        const products = await Product.find({ sellerId: req.user.id });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: View pending products
router.get('/admin/pending', auth(['admin']), async (req, res) => {
    try {
        const products = await Product.find({ status: 'pending' }).populate('sellerId', 'name email');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Approve/Reject/Update Product
router.patch('/admin/approve/:id', auth(['admin']), async (req, res) => {
    try {
        const { adminPrice, commission, status, title, description, moq, category, stock, hsnCode, gstPercentage, variations, tieredPricing, weight, length, breadth, height } = req.body;
        const updateFields = {
            adminPrice, commission, status, title, description,
            moq, category, stock, hsnCode, gstPercentage,
            variations, tieredPricing, weight,
            dimensions: { length, breadth, height }
        };

        const product = await Product.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Seller: Toggle Stock Availability and Update Stock
router.patch('/seller/update-stock/:id', auth(['seller']), async (req, res) => {
    try {
        const { isAvailable, stock } = req.body;
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, sellerId: req.user.id },
            { isAvailable, stock },
            { new: true }
        );
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Seller: Update product details
router.put('/seller/update/:id', auth(['seller']), upload.array('images', 10), async (req, res) => {
    try {
        let { title, description, sellerPrice, moq, stock, category, hsnCode, gstPercentage, weight, length, breadth, height, variations, tieredPricing } = req.body;

        if (typeof variations === 'string') {
            try { variations = JSON.parse(variations); } catch (e) { variations = []; }
        }
        if (typeof tieredPricing === 'string') {
            try { tieredPricing = JSON.parse(tieredPricing); } catch (e) { tieredPricing = []; }
        }

        // Validation
        if (hsnCode && hsnCode.length < 6) {
            return res.status(400).json({ error: 'HSN Code must be at least 6 digits' });
        }

        const updateData = {
            title, description, sellerPrice, moq, stock,
            category, hsnCode, gstPercentage,
            weight,
            weight,
            dimensions: { length, breadth, height },
            variations,
            tieredPricing,
            status: 'pending' // Reset to pending after update for re-approval
        };

        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(file => `http://localhost:5000/uploads/${file.filename}`);
            updateData.imageUrls = newImageUrls; // Overwrite or could append, but usually overwrite is simpler for basic update
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, sellerId: req.user.id },
            updateData,
            { new: true }
        );

        if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Public: Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            status: 'approved',
            isAvailable: true
        }).populate('sellerId', 'name');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buyer: Fetch approved products
// Buyer: Fetch approved products with filters
router.get('/buyer/list', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = { status: 'approved', isAvailable: true };

        if (category && category !== 'All Categories') {
            query.category = category;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const products = await Product.find(query).populate('sellerId', 'name');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all approved products with filters
router.get('/admin/approved', auth(['admin']), async (req, res) => {
    try {
        const { search, category, sellerId } = req.query;
        let query = { status: 'approved' };

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (category) {
            query.category = category;
        }
        if (sellerId) {
            query.sellerId = sellerId;
        }

        const products = await Product.find(query).populate('sellerId', 'name email');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
