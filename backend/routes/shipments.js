const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const shiprocket = require('../utils/shiprocket');
const User = require('../models/User');




//pickup address save to user 
router.post(
  "/register-pickup",
  auth(['seller']),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        locationName,
        name,
        phone,
        address,
        address2,
        city,
        state,
        pincode
      } = req.body;

      // Save in DB
      user.pickupAddressDetails = {
        locationName,
        name,
        phone,
        address,
        address2,
        city,
        state,
        pincode
      };

      await user.save();

      res.json({
        message: "Pickup address saved successfully",
        pickupAddressDetails: user.pickupAddressDetails
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
// Create Shiprocket Order
router.post('/create-order', auth(['seller', 'admin']), async (req, res) => {
    try {
        const { orderId, length, breadth, height, weight, pickupLocation: pickupLocationOverride } = req.body;

        const order = await Order.findById(orderId).populate({
            path: 'productId',
            populate: { path: 'sellerId', model: 'User' }
        }).populate('buyerId');

        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (!order.productId || !order.productId.sellerId) return res.status(400).json({ message: 'Seller information missing in product' });
        if (!order.buyerId) return res.status(400).json({ message: 'Buyer information missing in order' });

        const seller = order.productId.sellerId;

        // Basic Order Data Mapping for Shiprocket
        const unitPrice = Math.max(1, Math.round(order.totalAmount / (order.quantity || 1)));
        const orderItems = [{
            name: (order.productId.title || 'Product').slice(0, 100),
            sku: (order.productId.sku || order.productId._id.toString()).slice(0, 45),
            units: order.quantity || 1,
            selling_price: unitPrice,
            discount: 0,
            tax: order.productId.gstPercentage || 0,
            hsn: order.productId.hsnCode || ''
        }];

        const shippingAddress = order.shippingAddress || {};

        // Sanitize Phone (Shiprocket needs 10 digits)
        let phone = shippingAddress.phone || order.buyerId.phone || "9876543210";
        phone = phone.toString().replace(/\D/g, '').slice(-10);
        if (phone.length < 10) phone = "9876543210"; // Fallback to avoid error

        // Sanitize Pincode (exactly 6 digits, fallback to Delhi)
        let pincode = (shippingAddress.pinCode || shippingAddress.pincode || '110001').toString().replace(/\D/g, '').slice(0, 6);
        if (pincode.length < 6) pincode = '110001';

        // Sanitize name parts (billing_last_name must not be empty for ShipRocket)
        const rawFullName = (shippingAddress.fullName || order.buyerId.name || 'Customer').trim();
        const nameParts = rawFullName.split(/\s+/).filter(Boolean);
        const billingFirstName = nameParts[0] || 'Customer';
        const billingLastName = nameParts.slice(1).join(' ') || 'User';

        // Priority: 1. Override from request (seller typed it in modal), 2. Seller profile nickname, 3. Registered pickup address name, 4. Global env, 5. empty string
        const pickupLocation = (pickupLocationOverride && pickupLocationOverride.trim())
            || seller.shiprocketNickname
            || seller.pickupAddressDetails?.locationName
            || process.env.SHIPROCKET_PICKUP_LOCATION
            || ''; // Omit 'Primary' default so ShipRocket uses account default instead of throwing an error for an unknown location
        console.log('[ShipRocket] Using pickup location:', pickupLocation);

        // Make order_id unique per attempt: append timestamp so retries don't hit "duplicate order" in ShipRocket
        const srOrderId = `${order._id.toString()}-${Date.now()}`;

        // Extract weight and dimensions from product if not provided in request
        let finalWeight = parseFloat(weight);
        let finalLength = parseFloat(length);
        let finalBreadth = parseFloat(breadth);
        let finalHeight = parseFloat(height);

        if (!finalWeight || !finalLength || !finalBreadth || !finalHeight) {
            let pWeight = order.productId.weight || 0.5;
            let pLength = order.productId.dimensions?.length || 10;
            let pBreadth = order.productId.dimensions?.breadth || 10;
            let pHeight = order.productId.dimensions?.height || 10;

            if (order.productId.tieredPricing && order.productId.tieredPricing.length > 0) {
                const sorted = [...order.productId.tieredPricing].sort((a, b) => b.moq - a.moq);
                const tier = sorted.find(t => order.quantity >= t.moq);
                if (tier) {
                    if (tier.weight) pWeight = tier.weight;
                    if (tier.length) pLength = tier.length;
                    if (tier.breadth) pBreadth = tier.breadth;
                    if (tier.height) pHeight = tier.height;
                }
            }

            if (!finalWeight) finalWeight = pWeight * (order.quantity || 1);
            if (!finalLength) finalLength = pLength;
            if (!finalBreadth) finalBreadth = pBreadth;
            if (!finalHeight) finalHeight = pHeight;
        }

        const payload = {
            order_id: srOrderId,
            order_date: order.createdAt.toISOString().split('T')[0] + ' ' + order.createdAt.toISOString().split('T')[1].split('.')[0],
            pickup_location: pickupLocation,
            billing_customer_name: billingFirstName,
            billing_last_name: billingLastName,
            billing_address: (shippingAddress.addressLine1 || 'Address').slice(0, 50),
            billing_address_2: (shippingAddress.addressLine2 || '').slice(0, 50),
            billing_city: (shippingAddress.city || 'City').slice(0, 50),
            billing_pincode: pincode,
            billing_state: (shippingAddress.state || 'State').slice(0, 50),
            billing_country: 'India',
            billing_email: order.buyerId.email || 'customer@example.com',
            billing_phone: phone,
            shipping_is_billing: true,
            order_items: orderItems,
            payment_method: 'Prepaid',
            sub_total: order.totalAmount,
            length: finalLength,
            breadth: finalBreadth,
            height: finalHeight,
            weight: finalWeight
        };

        console.log('[ShipRocket] Payload:', JSON.stringify(payload));

        if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
            console.error('[ShipRocket] ERROR: Missing credentials in environment variables');
            return res.status(500).json({
                error: 'ShipRocket Credentials Missing',
                message: 'Internal server error: SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not configured on server.'
            });
        }

        const srResponse = await shiprocket.createOrder(payload).catch(err => {
            console.error('[ShipRocket] API Call Error:', JSON.stringify(err));
            throw err;
        });

        console.log('[ShipRocket] Raw response:', JSON.stringify(srResponse));

        // ShipRocket sometimes returns HTTP 200 but includes errors in the body.
        // Detect failures via: status_code >= 400, OR errors object present, OR order_id is falsy.
        const hasErrors = (srResponse.status_code && srResponse.status_code >= 400)
            || (srResponse.errors && Object.keys(srResponse.errors).length > 0)
            || (!srResponse.order_id && !srResponse.shipment_id);

        if (hasErrors) {
            const errMsg = srResponse.message
                || (srResponse.errors ? JSON.stringify(srResponse.errors) : null)
                || 'ShipRocket rejected the order — check payload fields.';
            console.error('[ShipRocket] Order rejected:', errMsg);
            return res.status(422).json({ error: errMsg, details: srResponse });
        }

        const newShipment = new Shipment({
            orderId: order._id,
            sellerId: req.user.id,
            shiprocketOrderId: srResponse.order_id,
            shipmentId: srResponse.shipment_id,
            status: 'Placed',
            weight: parseFloat(weight) || 0.5,
            length: parseFloat(length) || 10,
            breadth: parseFloat(breadth) || 10,
            height: parseFloat(height) || 10
        });

        await newShipment.save();

        order.logisticsStatus = 'ready-to-ship';
        await order.save();

        res.json({ message: 'Shiprocket Order Created', data: srResponse, shipment: newShipment });
    } catch (err) {
        console.error('[ShipRocket Create Order Error Full]', err);

        // Extract useful error info
        let errorMessage = 'Failed to create Shiprocket order';
        let statusCode = 500;

        if (err.message && err.message.toLowerCase().includes('authentication failed')) {
            errorMessage = 'ShipRocket Integration Error: Authentication failed. Please check credentials.';
            statusCode = 502;
        } else if (err.errors) {
            errorMessage = typeof err.errors === 'string' ? err.errors : JSON.stringify(err.errors);
        } else if (err.message) {
            errorMessage = err.message;
        } else if (typeof err === 'string') {
            errorMessage = err;
        }

        res.status(statusCode).json({ error: errorMessage, details: err });
    }
});

// Calculate Shipping Cost (Serviceability)
router.post('/check-serviceability', auth(['seller', 'admin']), async (req, res) => {
    try {
        const { pickupPincode, deliveryPincode, weight, length, breadth, height, cod } = req.body;
        const data = await shiprocket.checkServiceability(
            pickupPincode, 
            deliveryPincode, 
            weight, 
            length, 
            breadth, 
            height, 
            cod ? 1 : 0
        );
        if (data.error) {
            return res.status(data.status || 500).json({ message: data.message });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @api {post} /api/shipments/calculate-rates Calculate Shipping Rates
 * @apiDescription Get detailed shipping rates from Shiprocket for given parameters
 * @apiAccess buyer, seller, admin
 */
router.post('/calculate-rates', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    try {
        const { 
            pickupPincode, 
            deliveryPincode, 
            weight, 
            length = 10, 
            breadth = 10, 
            height = 10, 
            cod = 0,
            isLogisticsPage = false // flag to return full data for admin/seller logistics view
        } = req.body;

        if (!pickupPincode || !deliveryPincode || !weight) {
            return res.status(400).json({ message: 'Pickup Pincode, Delivery Pincode, and Weight are required' });
        }

        const data = await shiprocket.checkServiceability(
            pickupPincode, 
            deliveryPincode, 
            weight, 
            length, 
            breadth, 
            height, 
            cod
        );

        if (data.error || data.status !== 200) {
            return res.status(data.status || 400).json({ message: data.message || 'Shiprocket serviceability check failed', data });
        }

        // If it's a simple request (like from cart), we might just want the cheapest or a summary
        // For admin/seller logistics page, return everything
        if (isLogisticsPage) {
            return res.json(data.data);
        }

        const couriers = data.data.available_courier_companies;
        if (!couriers || couriers.length === 0) {
            return res.status(404).json({ message: 'No shipping service available for this route' });
        }

        // Find cheapest and fastest options
        const cheapest = couriers.reduce((prev, curr) => (prev.rate < curr.rate) ? prev : curr);
        const fastest = couriers.reduce((prev, curr) => {
            const prevDays = parseInt(prev.etd_hours) || 999;
            const currDays = parseInt(curr.etd_hours) || 999;
            return (prevDays < currDays) ? prev : curr;
        });

        res.json({
            success: true,
            total_couriers: couriers.length,
            cheapest: {
                name: cheapest.courier_name,
                rate: Math.ceil(cheapest.rate),
                etd: cheapest.etd
            },
            fastest: {
                name: fastest.courier_name,
                rate: Math.ceil(fastest.rate),
                etd: fastest.etd
            },
            all_couriers: couriers.map(c => ({
                id: c.courier_company_id,
                name: c.courier_name,
                rate: Math.ceil(c.rate),
                etd: c.etd,
                rating: c.rating
            }))
        });

    } catch (err) {
        console.error('[Calculate Rates Error]', err);
        res.status(500).json({ 
            error: 'Failed to calculate shipping rates', 
            details: err.message || err 
        });
    }
});

// Generate AWB (Assign Courier)
router.post('/generate-awb', auth(['seller', 'admin']), async (req, res) => {
    try {
        const { shipmentId } = req.body;
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

        const srResponse = await shiprocket.generateAWB(shipment.shipmentId);

        shipment.awbCode = srResponse.response.data.awb_code;
        shipment.courierName = srResponse.response.data.courier_name;
        shipment.courierId = srResponse.response.data.courier_company_id;
        shipment.status = 'AWB Assigned';
        await shipment.save();

        // Update Order
        await Order.findByIdAndUpdate(shipment.orderId, { logisticsStatus: 'awb-assigned' });

        res.json({ message: 'AWB Assigned', data: srResponse });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Request Pickup
router.post('/request-pickup', auth(['seller', 'admin']), async (req, res) => {
    try {
        const { shipmentId } = req.body;
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

        const srResponse = await shiprocket.requestPickup(shipment.shipmentId);

        shipment.status = 'Pickup Scheduled';
        await shipment.save();

        // Update Order
        await Order.findByIdAndUpdate(shipment.orderId, { logisticsStatus: 'pickup-scheduled' });

        res.json({ message: 'Pickup Scheduled', data: srResponse });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Label
router.post('/generate-label', auth(['seller', 'admin']), async (req, res) => {
    try {
        const { shipmentId } = req.body;
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

        const srResponse = await shiprocket.generateLabel(shipment.shipmentId);

        shipment.labelUrl = srResponse.label_url;
        await shipment.save();

        res.json({ labelUrl: srResponse.label_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Manifest
router.post('/generate-manifest', auth(['seller', 'admin']), async (req, res) => {
    try {
        const { shipmentId } = req.body;
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

        const srResponse = await shiprocket.generateManifest(shipment.shipmentId);
        shipment.manifestUrl = srResponse.manifest_url;
        await shipment.save();

        // Update Order
        await Order.findByIdAndUpdate(shipment.orderId, { logisticsStatus: 'manifest-generated' });

        res.json({ manifestUrl: srResponse.manifest_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Track Shipment
router.get('/track/:awb', auth(['seller', 'admin', 'buyer']), async (req, res) => {
    try {
        const { awb } = req.params;
        const srResponse = await shiprocket.trackShipment(awb);
        res.json(srResponse);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Shipments for Order (sellers/admin manage; buyers view their own)
router.get('/order/:orderId', auth(['seller', 'admin', 'buyer']), async (req, res) => {
    try {
        const shipments = await Shipment.find({ orderId: req.params.orderId });
        res.json(shipments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────
// ShipRocket Webhook  (public – ShipRocket posts here)
// Configure this URL in ShipRocket: Settings > API > Webhooks
// ──────────────────────────────────────────────────
router.post('/webhook', express.json(), async (req, res) => {
    try {
        const payload = req.body;
        console.log('[ShipRocket Webhook]', JSON.stringify(payload));

        // ShipRocket webhook sends awb, current_status, etc.
        const awb = payload.awb || payload.etd || '';
        const srStatus = (payload.current_status || payload.status || '').toLowerCase();
        const activity = payload.activity || payload.current_status || '';
        const location = payload.location || payload.city || '';
        const eventDate = payload.event_time ? new Date(payload.event_time) : new Date();

        if (!awb && !payload.order_id && !payload.shipment_id && !payload.channel_order_id) {
            return res.json({ received: true, note: 'No identifiable ID in payload' });
        }

        // Map ShipRocket status to our logisticsStatus
        let logisticsStatus = null;
        if (srStatus.includes('delivered')) {
            logisticsStatus = 'delivered';
        } else if (srStatus.includes('transit') || srStatus.includes('in transit')) {
            logisticsStatus = 'in-transit';
        } else if (srStatus.includes('picked up') || srStatus.includes('pickup')) {
            logisticsStatus = 'pickup-scheduled';
        } else if (srStatus.includes('rto') || srStatus.includes('returned')) {
            logisticsStatus = 'rto';
        } else if (srStatus.includes('shipment created') || srStatus.includes('manifested')) {
            logisticsStatus = 'manifest-generated';
        } else if (srStatus.includes('cancel') || srStatus.includes('canceled')) {
            logisticsStatus = 'cancelled';
        }

        // Find shipment by AWB code, order_id, or shipment_id
        let shipment = null;
        if (awb) shipment = await Shipment.findOne({ awbCode: awb });
        if (!shipment && payload.order_id) shipment = await Shipment.findOne({ shiprocketOrderId: String(payload.order_id) });
        if (!shipment && payload.shipment_id) shipment = await Shipment.findOne({ shipmentId: String(payload.shipment_id) });

        if (shipment) {
            // Append to tracking history
            shipment.trackingHistory.push({ status: payload.current_status || srStatus, location, date: eventDate, activity });
            if (logisticsStatus) shipment.status = payload.current_status || srStatus;
            await shipment.save();

            // Update linked order
            if (logisticsStatus) {
                const orderUpdate = { logisticsStatus };
                if (logisticsStatus === 'delivered') orderUpdate.orderStatus = 'delivered';
                if (logisticsStatus === 'in-transit' || logisticsStatus === 'pickup-scheduled') orderUpdate.orderStatus = 'shipped';
                if (logisticsStatus === 'cancelled' || logisticsStatus === 'rto') orderUpdate.orderStatus = 'cancelled';
                await Order.findByIdAndUpdate(shipment.orderId, orderUpdate);
            }
        }

        res.json({ received: true });
    } catch (err) {
        console.error('[ShipRocket Webhook Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────
// Sync Cancelled Orders (fixes orders missed by webhook)
// POST /api/shipments/sync-cancelled
// ──────────────────────────────────────────────────
router.post('/sync-cancelled', auth(['seller', 'admin']), async (req, res) => {
    try {
        const canceledShipments = await Shipment.find({
            status: { $in: ['Canceled', 'CANCELED', 'cancelled', 'Cancelled'] }
        });

        let fixed = 0;
        for (const s of canceledShipments) {
            const updated = await Order.findOneAndUpdate(
                { _id: s.orderId, logisticsStatus: { $ne: 'cancelled' } },
                { logisticsStatus: 'cancelled', orderStatus: 'cancelled' },
                { new: true }
            );
            if (updated) fixed++;
        }

        res.json({ message: `Synced ${fixed} cancelled orders`, total: canceledShipments.length });
    } catch (err) {
        console.error('[Sync Cancelled Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────
// Sync Active Seller Orders with Shiprocket
// POST /api/shipments/sync-seller-orders
// ──────────────────────────────────────────────────
router.post('/sync-seller-orders', auth(['seller', 'admin']), async (req, res) => {
    try {
        const activeShipments = await Shipment.find({
            sellerId: req.user.id,
            status: { $nin: ['DELIVERED', 'CANCELED', 'CANCELLED', 'cancelled', 'delivered'] }
        });

        let updatedCount = 0;

        for (const shipment of activeShipments) {
            if (!shipment.shiprocketOrderId) continue;

            try {
                const srRes = await shiprocket.getOrderDetails(shipment.shiprocketOrderId);
                const srStatus = srRes.data?.status;

                if (srStatus && srStatus !== shipment.status) {
                    shipment.status = srStatus;
                    await shipment.save();

                    // Map to logisticsStatus
                    let logisticsStatus = null;
                    const srStatusLower = srStatus.toLowerCase();
                    if (srStatusLower.includes('delivered')) logisticsStatus = 'delivered';
                    else if (srStatusLower.includes('transit') || srStatusLower.includes('in transit')) logisticsStatus = 'in-transit';
                    else if (srStatusLower.includes('picked up') || srStatusLower.includes('pickup')) logisticsStatus = 'pickup-scheduled';
                    else if (srStatusLower.includes('rto') || srStatusLower.includes('returned')) logisticsStatus = 'rto';
                    else if (srStatusLower.includes('shipment created') || srStatusLower.includes('manifested')) logisticsStatus = 'manifest-generated';
                    else if (srStatusLower.includes('cancel') || srStatusLower.includes('canceled')) logisticsStatus = 'cancelled';

                    if (logisticsStatus) {
                        const orderUpdate = { logisticsStatus };
                        if (logisticsStatus === 'delivered') orderUpdate.orderStatus = 'delivered';
                        if (logisticsStatus === 'in-transit' || logisticsStatus === 'pickup-scheduled') orderUpdate.orderStatus = 'shipped';
                        if (logisticsStatus === 'cancelled' || logisticsStatus === 'rto') orderUpdate.orderStatus = 'cancelled';
                        await Order.findByIdAndUpdate(shipment.orderId, orderUpdate);
                    }
                    updatedCount++;
                }
            } catch (err) {
                console.error(`Failed to sync shipment ${shipment.shiprocketOrderId}:`, err);
            }
        }

        res.json({ message: 'Sync complete', updatedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────
// Manually cancel a specific order's logistics status
// PATCH /api/shipments/cancel-order/:orderId
// ──────────────────────────────────────────────────
router.patch('/cancel-order/:orderId', auth(['seller', 'admin']), async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            { logisticsStatus: 'cancelled', orderStatus: 'cancelled' },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: 'Order not found' });

        await Shipment.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status: 'CANCELED' }
        );

        res.json({ message: 'Order marked as cancelled', order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
