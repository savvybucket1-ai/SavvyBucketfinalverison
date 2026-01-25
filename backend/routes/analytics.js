const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const router = express.Router();

// Admin: Get comprehensive dashboard statistics
router.get('/dashboard-stats', auth(['admin']), async (req, res) => {
    try {
        // Get counts
        const totalBuyers = await User.countDocuments({ role: 'buyer' });
        const totalSellers = await User.countDocuments({ role: 'seller' });
        const approvedProducts = await Product.countDocuments({ status: 'approved' });
        const pendingProducts = await Product.countDocuments({ status: 'pending' });
        const rejectedProducts = await Product.countDocuments({ status: 'rejected' });
        const totalOrders = await Order.countDocuments();

        // Calculate revenue and commission
        const orders = await Order.find();
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const totalCommission = orders.reduce((sum, order) => sum + (order.adminCommission || 0), 0);

        // Get current month's data for growth calculation
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

        // Current month stats
        const currentMonthOrders = await Order.countDocuments({
            createdAt: { $gte: firstDayOfMonth }
        });
        const currentMonthRevenue = (await Order.find({
            createdAt: { $gte: firstDayOfMonth }
        })).reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const currentMonthSellers = await User.countDocuments({
            role: 'seller',
            createdAt: { $gte: firstDayOfMonth }
        });

        // Last month stats
        const lastMonthOrders = await Order.countDocuments({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });
        const lastMonthRevenue = (await Order.find({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        })).reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const lastMonthSellers = await User.countDocuments({
            role: 'seller',
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });

        // Calculate growth percentages
        const ordersGrowth = lastMonthOrders > 0
            ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders * 100).toFixed(1)
            : currentMonthOrders > 0 ? 100 : 0;

        const revenueGrowth = lastMonthRevenue > 0
            ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
            : currentMonthRevenue > 0 ? 100 : 0;

        const sellersGrowth = lastMonthSellers > 0
            ? ((currentMonthSellers - lastMonthSellers) / lastMonthSellers * 100).toFixed(1)
            : currentMonthSellers > 0 ? 100 : 0;

        // Get top selling products
        const topProducts = await Order.aggregate([
            {
                $group: {
                    _id: '$productId',
                    totalSold: { $sum: '$quantity' },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' }
        ]);

        // Get recent activity (last 10 activities)
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('buyerId', 'name')
            .populate('productId', 'title');

        const recentApprovals = await Product.find({ status: 'approved' })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('sellerId', 'name');

        const recentSellers = await User.find({ role: 'seller' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email createdAt');

        const recentActivity = [
            ...recentOrders.map(o => ({
                type: 'order',
                message: `New order #${o._id.toString().slice(-6)} by ${o.buyerId?.name || 'Customer'}`,
                time: o.createdAt
            })),
            ...recentApprovals.map(p => ({
                type: 'approval',
                message: `Approved "${p.title}" from ${p.sellerId?.name || 'Seller'}`,
                time: p.updatedAt
            })),
            ...recentSellers.map(s => ({
                type: 'seller',
                message: `New seller registered: ${s.name}`,
                time: s.createdAt
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

        res.json({
            totalRevenue,
            totalCommission,
            totalOrders,
            totalBuyers,
            totalSellers,
            approvedProducts,
            pendingProducts,
            rejectedProducts,
            monthlyGrowth: {
                orders: parseFloat(ordersGrowth),
                revenue: parseFloat(revenueGrowth),
                sellers: parseFloat(sellersGrowth)
            },
            topProducts: topProducts.map(p => ({
                id: p._id,
                title: p.product.title,
                totalSold: p.totalSold,
                revenue: p.revenue,
                image: p.product.imageUrls?.[0]
            })),
            recentActivity
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get revenue chart data
router.get('/revenue-chart', auth(['admin']), async (req, res) => {
    try {
        const { period = 'month' } = req.query; // 'week', 'month', 'year'

        let startDate, groupFormat;
        const currentDate = new Date();

        if (period === 'week') {
            startDate = new Date(currentDate.setDate(currentDate.getDate() - 7));
            groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        } else if (period === 'month') {
            startDate = new Date(currentDate.setDate(currentDate.getDate() - 30));
            groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        } else {
            startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 12));
            groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        }

        const revenueData = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(revenueData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all buyers with statistics
router.get('/buyers', auth(['admin']), async (req, res) => {
    try {
        const buyers = await User.find({ role: 'buyer' }).select('-password');

        const enrichedBuyers = await Promise.all(buyers.map(async (buyer) => {
            const orders = await Order.find({ buyerId: buyer._id });
            const totalOrders = orders.length;
            const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            return {
                ...buyer._doc,
                totalOrders,
                totalSpent
            };
        }));

        res.json(enrichedBuyers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
