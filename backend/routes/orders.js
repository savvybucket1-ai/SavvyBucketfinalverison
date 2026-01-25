const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const router = express.Router();

// Buyer: Create Stripe Checkout Session
router.post('/create-checkout-session', auth(['buyer']), async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);
        if (!product || product.status !== 'approved' || !product.isAvailable) {
            return res.status(404).json({ message: 'Product not found or not available' });
        }

        if (quantity < product.moq) {
            return res.status(400).json({ message: `Minimum order quantity for this product is ${product.moq}` });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }

        const totalAmount = product.adminPrice * quantity;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: product.title,
                        description: product.description,
                    },
                    unit_amount: product.adminPrice * 100, // in paise
                },
                quantity: quantity,
            }],
            mode: 'payment',
            success_url: `http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:5173/cart`,
            metadata: {
                buyerId: req.user.id,
                productId: productId,
                quantity: quantity.toString()
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buyer: Verify Session and Create Order
router.post('/verify-stripe-session', auth(['buyer']), async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ message: 'Payment not completed' });
        }

        const { buyerId, productId, quantity } = session.metadata;
        const product = await Product.findById(productId);

        const totalAmount = product.adminPrice * parseInt(quantity);
        const adminCommission = (product.commission / 100) * totalAmount;
        const sellerEarning = totalAmount - adminCommission;

        const newOrder = new Order({
            buyerId,
            productId,
            quantity: parseInt(quantity),
            totalAmount,
            adminCommission,
            sellerEarning,
            paymentStatus: 'completed',
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent
        });

        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Role-based Order Lists
router.get('/my-orders', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'buyer') query = { buyerId: req.user.id };
        else if (req.user.role === 'seller') {
            const myProducts = await Product.find({ sellerId: req.user.id }).select('_id');
            query = { productId: { $in: myProducts.map(p => p._id) } };
        }

        const orders = await Order.find(query).populate('productId').populate('buyerId', 'name email');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update Logistics Status
router.patch('/admin/update-logistics/:id', auth(['admin']), async (req, res) => {
    try {
        const { logisticsStatus, routingNotes } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { logisticsStatus, routingNotes }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
