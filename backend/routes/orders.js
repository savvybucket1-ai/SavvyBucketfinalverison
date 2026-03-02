const express = require('express');

const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const axios = require('axios');
const router = express.Router();
const { generateHash, verifyPaymentHash, generateResponseHash } = require('../utils/easebuzz');

// Buyer: Create Easebuzz Session (Initiate Payment)
/**
 * @swagger
 * /api/orders/create-easebuzz-session:
 *   post:
 *     summary: Initiate a payment session
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - shippingAddress
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   pinCode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Payment URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 * */
router.post('/create-easebuzz-session', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    console.log('--- Easebuzz Session Request Received ---');
    try {
        const { shippingAddress } = req.body;
        let items = req.body.items;

        // Backward compatibility for single product request
        if (!items && req.body.productId) {
            items = [{
                productId: req.body.productId,
                quantity: req.body.quantity,
                selectedVariation: req.body.selectedVariation
            }];
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in checkout' });
        }

        const txnid = `SB${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        let totalPayable = 0;
        const orderDocs = [];

        // 1. Validate info and calculate totals
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product || product.status !== 'approved' || !product.isAvailable) {
                return res.status(404).json({ message: `Product ${item.productId} not found or unavailable` });
            }
            if (item.quantity < product.moq) {
                return res.status(400).json({ message: `Quantity for ${product.title} is below MOQ (${product.moq})` });
            }

            // Price calculation logic (handling tiered pricing if needed, or simple)
            // Simplified: Use tiered pricing logic if accurate, or just adminPrice?
            // backend logic should mirror frontend. frontend uses tiered.
            let unitPrice = product.adminPrice || 0;
            let sellerUnitPrice = product.sellerPrice || unitPrice;

            if (product.tieredPricing && product.tieredPricing.length > 0) {
                const sorted = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
                const tier = sorted.find(t => item.quantity >= t.moq);
                if (tier) {
                    unitPrice = tier.price;
                    // Scale seller price proportionally based on the markup ratio of the base product
                    const ratio = (product.adminPrice && product.adminPrice > 0) ? (product.sellerPrice / product.adminPrice) : 1;
                    sellerUnitPrice = tier.price * ratio;
                }
            }

            const lineAmount = unitPrice * item.quantity;
            const lineAmountWithGst = lineAmount * (1 + (product.gstPercentage || 0) / 100);

            const sellerLineAmount = sellerUnitPrice * item.quantity;
            const sellerEarning = sellerLineAmount * (1 + (product.gstPercentage || 0) / 100);

            const adminCommission = lineAmountWithGst - sellerEarning;

            totalPayable += lineAmountWithGst;

            orderDocs.push({
                buyerId: req.user.id,
                productId: item.productId,
                quantity: item.quantity,
                selectedVariation: item.selectedVariation,
                totalAmount: Math.round(lineAmountWithGst), // Storing rounded value
                adminCommission: Math.round(adminCommission),
                sellerEarning: Math.round(sellerEarning),
                paymentStatus: 'pending',
                orderStatus: 'awaiting_payment',
                logisticsStatus: 'pending',
                paymentGateway: 'easebuzz',
                easebuzzTransactionId: txnid,
                shippingAddress
            });
        }

        // 2. Save all orders
        await Order.insertMany(orderDocs);

        const amount = totalPayable.toFixed(2);
        const baseUrl = 'https://savvy-backend-hazel.vercel.app';


        const data = {
            key: (process.env.EASEBUZZ_KEY || '').trim(),
            txnid: String(txnid),
            amount: String(amount),
            productinfo: 'OrderItems',
            firstname: (String(shippingAddress?.fullName || req.user?.name || 'Customer')).trim().replace(/[^a-zA-Z]/g, '').substring(0, 20) || 'Customer',
            email: (String(req.user?.email || 'customer@example.com')).trim(),
            phone: (String(shippingAddress?.phone || '9999999999')).replace(/[^0-9]/g, '').slice(-10).padEnd(10, '0'),
            surl: `${baseUrl}/api/orders/easebuzz-callback`,
            furl: `${baseUrl}/api/orders/easebuzz-callback`,
            udf1: '', udf2: '', udf3: '', udf4: '', udf5: ''
        };

        if (data.firstname.length < 3) data.firstname = 'Customer';
        console.log('Easebuzz Request Data:', { ...data, key: data.key.substring(0, 3) + '...' });

        // SAFETY: Capping name
        if (data.firstname.length > 20) data.firstname = data.firstname.substring(0, 20);
        if (data.firstname.length < 3) data.firstname = 'Customer';

        console.log('Sending to Easebuzz:', { ...data, key: data.key.substring(0, 4) + '...' });

        const hash = generateHash(data);
        data.hash = hash;

        if (!process.env.EASEBUZZ_KEY || process.env.EASEBUZZ_KEY === 'C1NWX7KJK4' === false && process.env.EASEBUZZ_KEY.includes('key_here')) {
            // Keep real credentials flow
        }

        console.log('Final Easebuzz Payload Hash:', data.hash);

        const formData = new URLSearchParams(data).toString();
        const isProdKey = (process.env.EASEBUZZ_KEY || '').startsWith('C1N');
        const easebuzzUrl = (process.env.EASEBUZZ_ENV === 'prod' || isProdKey)
            ? 'https://pay.easebuzz.in/payment/initiateLink'
            : 'https://testpay.easebuzz.in/payment/initiateLink';

        const response = await axios.post(easebuzzUrl, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const result = response.data;

        if (result.status === 1) {
            const paymentUrl = (process.env.EASEBUZZ_ENV === 'prod' || isProdKey)
                ? `https://pay.easebuzz.in/pay/${result.data}`
                : `https://testpay.easebuzz.in/pay/${result.data}`;
            res.json({ url: paymentUrl });
        } else {
            console.error('Easebuzz Init Failed:', JSON.stringify(result, null, 2));
            // Cleanup pending orders
            await Order.deleteMany({ easebuzzTransactionId: txnid });
            res.status(400).json({
                message: `Payment initiation failed: ${result.data || 'Unknown Reason'}`,
                details: result
            });
        }

    } catch (err) {
        console.error('Easebuzz Error:', err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || err.response?.data || err.message;
        res.status(err.response?.status || 500).json({
            message: `Checkout failed: ${errorMessage}`,
            error: err.message,
            details: err.response?.data
        });
    }
});

// Easebuzz Callback (Public)
router.post('/easebuzz-callback', express.urlencoded({ extended: true }), async (req, res) => {
    try {
        const verified = verifyPaymentHash(req.body);

        if (!verified) {
            console.error('Easebuzz Hash Mismatch', req.body);
            return res.status(400).send('Payment Verification Failed');
        }

        const { txnid, status } = req.body;

         if (status === 'success' || status === 'prepaid') {
            const orders = await Order.find({ easebuzzTransactionId: txnid });

            if (orders.length > 0) {
                // Update all orders in this transaction
                await Order.updateMany(
  { easebuzzTransactionId: txnid },
  {
    $set: {
      paymentStatus: 'completed',
      easebuzzPaymentId: req.body.easepayid, // store separately
      orderStatus: 'confirmed'
    }
  }
);

                // Clear cart (Optional: Frontend usually clears it on success page, but good to know)
                console.log(`Payment success for transaction ${txnid}. ${orders.length} orders confirmed.`);
                return res.redirect('https://savvy-frontend-teal.vercel.app/success');
            } else {
                console.error(`Orders not found for transaction ${txnid}`);
                return res.redirect('https://savvy-frontend-teal.vercel.app/cart?error=order_not_found');
            }
        } else {
            // Payment Failed
            console.log(`Payment failed for transaction ${txnid}`);
            await Order.deleteMany({ easebuzzTransactionId: txnid }); // Cleanup
            return res.redirect('https://savvy-frontend-teal.vercel.app/cart?error=payment_failed');
        }

    } catch (err) {
        console.error('Callback Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Buyer: Create Stripe Checkout Session



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

// Mock Payment Bypass Route (For testing without valid keys)
router.get('/mock-payment-bypass', async (req, res) => {
    try {
        const { txnid, amount, productinfo, firstname, email, udf1, udf2, udf3 } = req.query;

        const data = {
            status: 'success',
            txnid, amount, productinfo, firstname, email,
            udf1: '', udf2: '', udf3: '', udf4: '', udf5: ''
        };

        const hash = generateResponseHash(data);

        // Auto-submit form to callback
        const html = `
            <html>
                <head><title>Simulating Payment...</title></head>
                <body>
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                        <h2 style="color:#0f172a;">Simulating Secure Payment...</h2>
                        <p style="color:#64748b;">Please wait while we redirect you.</p>
                        <form action="https://savvy-backend-hazel.vercel.app/api/orders/easebuzz-callback" method="POST" name="payform">
                            <input type="hidden" name="status" value="success">
                            <input type="hidden" name="txnid" value="${txnid}">
                            <input type="hidden" name="amount" value="${amount}">
                            <input type="hidden" name="productinfo" value="${productinfo}">
                            <input type="hidden" name="firstname" value="${firstname}">
                            <input type="hidden" name="email" value="${email}">
                            <input type="hidden" name="udf1" value="${udf1}">
                            <input type="hidden" name="udf2" value="${udf2}">
                            <input type="hidden" name="udf3" value="${udf3}">
                            <input type="hidden" name="hash" value="${hash}">
                        </form>
                        <script>
                            setTimeout(() => { document.payform.submit(); }, 1500);
                        </script>
                    </div>
                </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send("Mock Error: " + err.message);
    }
});

// Admin: Fetch all orders pending seller payout or paid
router.get('/admin/payouts', auth(['admin']), async (req, res) => {
    try {
        // Fetch all non-cancelled orders to show pending payouts too
        const orders = await Order.find({ orderStatus: { $ne: 'cancelled' } })
            .populate('productId', 'title sellerId')
            .populate({
                path: 'productId',
                populate: { path: 'sellerId', model: 'User', select: 'name email bankDetails phone' }
            })
            .sort({ createdAt: -1 });

        // Group by seller if needed, but per-order is simpler for table row structure
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Toggle seller payout status (Mark Pending / Paid)
router.patch('/admin/payouts/:id/status', auth(['admin']), async (req, res) => {
    try {
        const { status } = req.body; // 'paid' or 'pending'
        if (!['paid', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findByIdAndUpdate(req.params.id, {
            sellerPayoutStatus: status
        }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Order by ID — registered LAST so it doesn't intercept named GET routes
router.get('/:id', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('productId').populate('buyerId', 'name email phone');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Access control: buyers can only view their own orders
        if (req.user.role === 'buyer' && order.buyerId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
