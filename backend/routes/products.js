const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const os = require('os');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

// Multer Config
const { storage: cloudStorage } = require('../config/cloudinary');
let upload;

if (process.env.CLOUDINARY_CLOUD_NAME) {
    upload = multer({ storage: cloudStorage });
    console.log('Using Cloudinary Storage for Products');
} else {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, os.tmpdir()),
        filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
    });
    upload = multer({ storage });
    console.log('Using Temp Disk Storage for Products (Cloudinary keys missing)');
}

// Seller: Add product (Multi-image upload)
router.post('/seller/add', auth(['seller']), upload.array('images', 10), async (req, res) => {
    try {
        let { title, description, sellerPrice, moq, stock, category, subCategory, hsnCode, gstPercentage, weight, length, breadth, height, variations, tieredPricing } = req.body;

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

        const imageUrls = (req.files || []).map(file => {
            if (file.path && file.path.startsWith('http')) return file.path;
            const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
            return baseUrl + file.filename;
        });

        const product = new Product({
            title, description, sellerPrice, imageUrls, moq, stock,
            category, subCategory, hsnCode, gstPercentage, // Added subCategory
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

// Seller: Fetch own products
router.get('/seller/list', auth(['seller']), async (req, res) => {
    try {
        console.log('Fetching products for seller ID:', req.user.id);
        const products = await Product.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
        console.log(`Found ${products.length} products for seller ${req.user.id}`);
        res.json(products);
    } catch (err) {
        console.error('Error in /seller/list:', err);
        res.status(500).json({ error: err.message });
    }
});

// Seller: Update stock/availability
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
        res.status(500).json({ error: err.message });
    }
});

// Seller: Update product details
router.put('/seller/update/:id', auth(['seller']), upload.array('images', 10), async (req, res) => {
    try {
        let { title, description, sellerPrice, moq, stock, category, subCategory, hsnCode, gstPercentage, weight, length, breadth, height, variations, tieredPricing } = req.body;

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
            category, subCategory, hsnCode, gstPercentage, // Added subCategory
            weight,
            dimensions: { length, breadth, height },
            variations,
            tieredPricing,
            status: 'pending' // Reset to pending after update for re-approval
        };

        let existingImages = [];
        if (req.body.existingImages) {
            try {
                existingImages = JSON.parse(req.body.existingImages);
            } catch (err) {
                existingImages = [];
            }
        }

        let newImageUrls = [];
        if (req.files && req.files.length > 0) {
            newImageUrls = req.files.map(file => {
                if (file.path && file.path.startsWith('http')) return file.path;
                const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
                return baseUrl + file.filename;
            });
        }

        // If 'existingImages' field was sent at all, overwrite with the combination
        // so that removal of old images is recognized by the database.
        if (req.body.existingImages !== undefined) {
             updateData.imageUrls = [...existingImages, ...newImageUrls];
        } else if (newImageUrls.length > 0) {
             updateData.imageUrls = newImageUrls;
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
        const { category, subCategory, search, sort } = req.query;
        let query = { status: 'approved', isAvailable: true };

        if (category && category !== 'All Categories') {
            query.category = category;
        }

        if (subCategory) {
            query.subCategory = subCategory;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        let productsQuery = Product.find(query).populate('sellerId', 'name');

        switch (sort) {
            case 'price_low':
                productsQuery = productsQuery.sort({ adminPrice: 1 });
                break;
            case 'price_high':
                productsQuery = productsQuery.sort({ adminPrice: -1 });
                break;
            case 'newest':
                productsQuery = productsQuery.sort({ createdAt: -1 });
                break;
            default:
                // Default sort (e.g. relevance/newest if needed, or no specific sort)
                break;
        }

        const products = await productsQuery;
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buyer: Fetch Trending Products
router.get('/buyer/trending', async (req, res) => {
    try {
        const products = await Product.find({ status: 'approved', isAvailable: true, isTrending: true }).populate('sellerId', 'name');
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

// Admin: Toggle Trending Status
router.patch('/admin/toggle-trending/:id', auth(['admin']), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.isTrending = !product.isTrending;
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buyer: Fetch Latest 20 Approved Products (Just Arrived)
router.get('/buyer/latest', async (req, res) => {
    try {
        const products = await Product.find({ status: 'approved', isAvailable: true })
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(20) // Limit to 20 products
            .populate('sellerId', 'name');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Admin: Fetch all pending products
// Admin: Fetch all pending products
router.get('/admin/pending', auth(['admin']), async (req, res) => {
    try {
        const products = await Product.find({ status: 'pending' }).populate('sellerId', 'name email');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Approve/Reject Product
router.patch('/admin/approve/:id', auth(['admin']), async (req, res) => {
    try {
        let { status, adminPrice, commission, title, description, category, moq, hsnCode, gstPercentage, stock, tieredPricing, variations, imageUrls } = req.body;

        const updateData = { status };

        if (status === 'approved') {
            // Save country-wise prices
            if (adminPrice && typeof adminPrice === 'object') {
                updateData.adminPrice = {
                    IN: Number(adminPrice.IN) || 0,
                    US: Number(adminPrice.US) || 0,
                    UK: Number(adminPrice.UK) || 0,
                    CA: Number(adminPrice.CA) || 0,
                    AU: Number(adminPrice.AU) || 0,
                    UAE: Number(adminPrice.UAE) || 0,
                };
            } else {
                // Fallback: if a single number was sent, use it for IN
                const singlePrice = Number(adminPrice) || 0;
                updateData.adminPrice = {
                    IN: singlePrice,
                    US: 0,
                    UK: 0,
                    CA: 0,
                    AU: 0,
                    UAE: 0,
                };
            }
            updateData.commission = Number(commission) || 0;
            updateData.title = title;
            updateData.description = description;
            updateData.category = category;
            updateData.moq = Number(moq) || 1;
            updateData.hsnCode = String(hsnCode);
            updateData.gstPercentage = Number(gstPercentage) || 0;
            updateData.stock = Number(stock) || 0;
            updateData.isAvailable = true;

            if (variations) updateData.variations = variations;
            if (imageUrls) updateData.imageUrls = imageUrls;

            if (tieredPricing && tieredPricing.length > 0) {
                updateData.tieredPricing = tieredPricing.map(t => ({
                    ...t,
                    moq: Number(t.moq) || 0,
                    price: Number(t.price) || 0,
                    length: Number(t.length) || 0,
                    breadth: Number(t.breadth || t.width) || 0,
                    height: Number(t.height) || 0,
                    weight: Number(t.weight) || 0
                }));

                // Automatically update top-level dimensions from the first tier (Base Unit)
                // Ensure we pick the smallest MOQ tier as base
                const baseTier = [...updateData.tieredPricing].sort((a, b) => a.moq - b.moq)[0];
                if (baseTier) {
                    if (baseTier.weight) updateData.weight = baseTier.weight;
                    updateData.dimensions = {
                        length: baseTier.length,
                        breadth: baseTier.breadth,
                        height: baseTier.height
                    };
                }
            }
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('sellerId');

        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Send Email Notification
        if (product.sellerId && product.sellerId.email) {
            const subject = `Product ${status === 'approved' ? 'Approved' : 'Rejected'} - SavvyBucket`;
            const message = `Hello ${product.sellerId.name},\n\nYour product "${product.title}" has been ${status} by the admin.\n\n${status === 'approved' ? 'It is now live on the marketplace.' : 'Please check the dashboard for details or contact support.'}\n\nRegards,\nSavvyBucket Team`;

            // Fire and forget email to not block response
            sendEmail({
                email: product.sellerId.email,
                subject,
                message,
                html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Product ${status === 'approved' ? '<span style="color:green">Approved</span>' : '<span style="color:red">Rejected</span>'}</h2><p>Hello <b>${product.sellerId.name}</b>,</p><p>Your product <b>${product.title}</b> has been ${status}.</p><p>${status === 'approved' ? 'It is now live on the marketplace.' : 'Please check your seller dashboard for more details.'}</p></div>`
            }).catch(e => console.error('Failed to send product approval email', e));
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Toggle Trending Status
router.patch('/admin/toggle-trending/:id', auth(['admin']), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.isTrending = !product.isTrending;
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update product details (without changing status)
router.put('/admin/update/:id', auth(['admin']), async (req, res) => {
    try {
        let {
            title, description, category, subCategory, moq, stock,
            hsnCode, gstPercentage, commission, adminPrice,
            variations, tieredPricing, imageUrls, weight, length, breadth, height
        } = req.body;

        if (typeof variations === 'string') {
            try { variations = JSON.parse(variations); } catch (e) { variations = []; }
        }
        if (typeof tieredPricing === 'string') {
            try { tieredPricing = JSON.parse(tieredPricing); } catch (e) { tieredPricing = []; }
        }

        if (hsnCode && String(hsnCode).length < 6) {
            return res.status(400).json({ error: 'HSN Code must be at least 6 digits' });
        }

        const updateData = {
            title, description, category, subCategory,
            moq: Number(moq) || 1,
            stock: Number(stock) || 0,
            hsnCode: hsnCode ? String(hsnCode) : undefined,
            gstPercentage: Number(gstPercentage) || 0,
            commission: Number(commission) || 0,
            weight: Number(weight) || undefined,
            dimensions: { length: Number(length), breadth: Number(breadth), height: Number(height) },
        };

        // Build country-wise adminPrice
        if (adminPrice && typeof adminPrice === 'object') {
            updateData.adminPrice = {
                IN: Number(adminPrice.IN) || 0,
                US: Number(adminPrice.US) || 0,
                UK: Number(adminPrice.UK) || 0,
                CA: Number(adminPrice.CA) || 0,
                AU: Number(adminPrice.AU) || 0,
                UAE: Number(adminPrice.UAE) || 0,
            };
        }

        if (variations) updateData.variations = variations;
        if (imageUrls) updateData.imageUrls = imageUrls;

        if (tieredPricing && tieredPricing.length > 0) {
            updateData.tieredPricing = tieredPricing.map(t => ({
                moq: Number(t.moq) || 1,
                price: Number(t.price) || 0,
                length: Number(t.length) || 0,
                breadth: Number(t.breadth || t.width) || 0,
                height: Number(t.height) || 0,
                weight: Number(t.weight) || 0
            }));

            const baseTier = [...updateData.tieredPricing].sort((a, b) => a.moq - b.moq)[0];
            if (baseTier) {
                if (baseTier.weight) updateData.weight = baseTier.weight;
                updateData.dimensions = { length: baseTier.length, breadth: baseTier.breadth, height: baseTier.height };
            }
        }

        // Remove undefined keys so $set doesn't overwrite with undefined
        Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('sellerId', 'name email');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
