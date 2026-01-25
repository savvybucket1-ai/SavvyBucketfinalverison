const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const user = new User({ name, email, password, role: role || 'buyer' });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

router.get('/sellers', auth(['admin']), async (req, res) => {
    try {
        const sellers = await User.find({ role: 'seller' }).select('-password');

        // Enrich sellers with stats
        const enrichedSellers = await Promise.all(sellers.map(async (seller) => {
            const productCount = await Product.countDocuments({ sellerId: seller._id });
            const orders = await Order.find({
                productId: { $in: await Product.find({ sellerId: seller._id }).select('_id') }
            });
            const totalEarnings = orders.reduce((sum, order) => sum + (order.sellerEarning || 0), 0);

            return {
                ...seller._doc,
                productCount,
                totalEarnings
            };
        }));

        res.json(enrichedSellers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Toggle Seller Block status
router.patch('/sellers/toggle-block/:id', auth(['admin']), async (req, res) => {
    try {
        const seller = await User.findById(req.params.id);
        if (!seller || seller.role !== 'seller') {
            return res.status(404).json({ message: 'Seller not found' });
        }

        seller.isBlocked = !seller.isBlocked;
        await seller.save();
        res.json({ message: `Seller ${seller.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: seller.isBlocked });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

