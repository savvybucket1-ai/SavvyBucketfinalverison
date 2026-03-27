const express = require('express');

const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');
const { generateHash, verifyPaymentHash, generateResponseHash } = require('../utils/easebuzz');
const shiprocket = require('../utils/shiprocket');

// Buyer: Create Easebuzz Session (Initiate Payment)
/**
 * @swagger
 * /api/orders/calculate-shipping:
 *   post:
 *     summary: Calculate shipping charges via Shiprocket
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
 *               - deliveryPincode
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               deliveryPincode:
 *                 type: string
 * */
router.post('/calculate-shipping', auth(['buyer', 'seller', 'admin']), async (req, res) => {
    try {
        const { items, deliveryPincode, shippingAddress } = req.body;
        if (!items || !deliveryPincode) {
            return res.status(400).json({ message: 'Items and delivery pincode are required' });
        }

        const destinationCountry = (shippingAddress?.country || 'India').trim();
        const isInternational = destinationCountry !== 'India';

        const cleanDeliveryPincode = isInternational
            ? deliveryPincode
            : deliveryPincode.toString().replace(/\D/g, '').slice(0, 6);

        // International flat rates (INR per kg, per seller group)
        const INTERNATIONAL_BASE_RATE_INR = 1500; // Base fee per seller group
        const INTERNATIONAL_PER_KG_RATE_INR = 800;  // Per kg charge

        let totalShippingFees = 0;
        const breakdowns = [];
        const groups = {};
        let isInvalidShipping = false;

        // 1. Group items by pickup pincode, collecting full product details
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                console.warn(`[Shipping Calc] Product not found: ${item.productId}`);
                continue;
            }

            // CHECK FOR MISSING DIMENSIONS - If missing, mark as invalid shipping
            if (!product.dimensions?.length || !product.dimensions?.breadth || !product.dimensions?.height) {
                isInvalidShipping = true;
            }

            const seller = await User.findById(product.sellerId);
            const pickupPincode = seller?.pickupAddressDetails?.pincode || '110001';

            // Resolve weight & dimensions from tiered pricing or product defaults
            let weight = product.weight || 0.5;
            let length = product.dimensions?.length || 10;
            let breadth = product.dimensions?.breadth || 10;
            let height = product.dimensions?.height || 10;

            let currentMoq = product.moq || 1;

            if (product.tieredPricing && product.tieredPricing.length > 0) {
                const sorted = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
                const tier = sorted.find(t => item.quantity >= t.moq);
                if (tier) {
                    if (tier.weight) weight = tier.weight;
                    if (tier.length) length = tier.length;
                    if (tier.breadth) breadth = tier.breadth;
                    if (tier.height) height = tier.height;
                    if (tier.moq) currentMoq = tier.moq;
                }
            }

            // Normalise the weight because sellers often provide weight for the MOQ batch, not per piece.
            const ratio = item.quantity / currentMoq;
            const itemTotalWeight = weight * ratio;
            
            const itemUnitPrice = Math.max(1, Math.round((product.adminPrice?.IN || product.sellerPrice || 1)));

            const groupKey = `${item.productId}_${Math.random().toString(36).substr(2, 9)}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    pickupPincode: pickupPincode,
                    totalWeight: 0,
                    length: 0,
                    breadth: 0,
                    height: 0,
                    totalDeclaredValue: 0,
                    items: [] 
                };
            }
            groups[groupKey].totalWeight += itemTotalWeight;
            groups[groupKey].length = Math.max(groups[groupKey].length, length);
            groups[groupKey].breadth = Math.max(groups[groupKey].breadth, breadth);
            groups[groupKey].height += height * Math.ceil(ratio);
            groups[groupKey].totalDeclaredValue += itemUnitPrice * item.quantity;
            groups[groupKey].items.push({
                name: product.title,
                sku: product.sku || product._id.toString(),
                units: item.quantity,
                selling_price: itemUnitPrice,
                tax: product.gstPercentage || 0,
                hsn: product.hsnCode || '',
                weight: weight,
                productId: product._id.toString()
            });
        }

        // 2. Fetch shipping price from ShipRocket for each individual item (group)
        // Skip calling Shiprocket if any dimension is missing
        if (!isInvalidShipping) {
            for (const groupKey in groups) {
                const group = groups[groupKey];
                const pickupPincode = group.pickupPincode;
                const volumetricWeight = (group.length * group.breadth * group.height) / 5000;
                const chargeableWeight = Math.max(group.totalWeight, volumetricWeight);

                group.totalWeight = chargeableWeight;

                if (isInternational) {
                    const fee = Math.ceil(INTERNATIONAL_BASE_RATE_INR + (group.totalWeight * INTERNATIONAL_PER_KG_RATE_INR));
                    totalShippingFees += fee;
                    breakdowns.push({
                        pickupPincode,
                        group_total_weight: group.totalWeight,
                        shippingFee: fee,
                        courier: 'International Courier',
                        destination_country: destinationCountry,
                        is_international: true,
                        declared_value: group.totalDeclaredValue,
                        items: group.items.map(i => ({ name: i.name, sku: i.sku, units: i.units, selling_price: i.selling_price }))
                    });
                    continue;
                }

                try {
                    const serviceability = await shiprocket.checkServiceability(
                        pickupPincode,
                        cleanDeliveryPincode,
                        group.totalWeight,
                        group.length || 10,
                        group.breadth || 10,
                        group.height || 10,
                        0,
                        group.totalDeclaredValue
                    );

                    let fee = 100;
                    let courier = 'Standard Shipping';
                    let allCouriers = [];

                    if (!serviceability.error && serviceability.status === 200 && serviceability.data?.available_courier_companies?.length > 0) {
                        const couriers = serviceability.data.available_courier_companies;
                        const getEffectiveRate = (c) => Number(c.et_total_amount ?? c.freight_charge ?? c.rate ?? 999999);
                        const getChargeWeight = (c) => Number(c.charge_weight ?? c.min_weight ?? 999);
                        const minChargeWeight = Math.min(...couriers.map(getChargeWeight));
                        const closestWeightCouriers = couriers.filter(c => getChargeWeight(c) <= minChargeWeight * 1.5 + 1);
                        const sorted = [...closestWeightCouriers].sort((a, b) => getEffectiveRate(a) - getEffectiveRate(b));
                        const cheapest = sorted[0] || couriers.sort((a, b) => getEffectiveRate(a) - getEffectiveRate(b))[0];

                        fee = Math.ceil(getEffectiveRate(cheapest));
                        courier = cheapest.courier_name;
                        allCouriers = sorted.map(c => ({
                            name: c.courier_name,
                            rate: Math.ceil(getEffectiveRate(c)),
                            etd: c.etd,
                            min_weight: c.min_weight
                        }));
                    } 

                    totalShippingFees += fee;
                    breakdowns.push({
                        pickupPincode,
                        group_total_weight: group.totalWeight,
                        shippingFee: fee,
                        courier,
                        destination_country: destinationCountry,
                        is_international: false,
                        items: group.items.map(i => ({ name: i.name, sku: i.sku, units: i.units, selling_price: i.selling_price }))
                    });
                } catch (err) {
                    totalShippingFees += 100;
                    breakdowns.push({
                        shippingFee: 100,
                        courier: 'Fallback Shipping',
                        items: group.items.map(i => ({ name: i.name, sku: i.sku, units: i.units, selling_price: i.selling_price }))
                    });
                }
            }
        }

        res.json({
            totalShippingFees: isInvalidShipping ? 0 : totalShippingFees,
            currency: 'INR',
            destination_country: destinationCountry,
            is_international: isInternational,
            isInvalidShipping: isInvalidShipping,
            breakdowns
        });
    } catch (err) {
        console.error('Shipping Calculation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

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
        const { shippingAddress, countryKey: rawCountryKey } = req.body;
        let items = req.body.items;

        // Determine user's country — default to 'US' (dollar) if not provided or not in our supported list
        const SUPPORTED_COUNTRIES = ['IN', 'US', 'UK', 'CA', 'AU', 'UAE'];
        const countryKey = (rawCountryKey && SUPPORTED_COUNTRIES.includes(rawCountryKey)) ? rawCountryKey : 'US';
        console.log('Checkout countryKey:', countryKey, '(raw:', rawCountryKey, ')');

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
        let totalShippingFeesInINR = 0;
        const orderDocs = [];

        // Helper: Get geo-aware price from adminPrice object
        // Falls back to US price if country price is missing, then IN price as last resort
        const getGeoPrice = (adminPrice, key) => {
            // Legacy support: if adminPrice is a plain number, return it as-is
            if (typeof adminPrice === 'number') return adminPrice;
            if (!adminPrice || typeof adminPrice !== 'object') return 0;

            const countryPrice = Number(adminPrice[key]) || 0;
            if (countryPrice === 0) {
                // If country not found, default to US price, then IN price
                return Number(adminPrice['US']) || Number(adminPrice['IN']) || 0;
            }
            return countryPrice;
        };

        // 1. First pass: Validate info, get product info, calculate items total, group by pickup pincode
        const processedItems = [];
        const groups = {};

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product || product.status !== 'approved' || !product.isAvailable) {
                return res.status(404).json({ message: `Product ${item.productId} not found or unavailable` });
            }
            if (item.quantity < product.moq) {
                return res.status(400).json({ message: `Quantity for ${product.title} is below MOQ (${product.moq})` });
            }

            const seller = await User.findById(product.sellerId);
            const pickupPincode = seller?.pickupAddressDetails?.pincode || "110001";

            // Get country-aware base price
            const baseGeoPrice = getGeoPrice(product.adminPrice, countryKey);
            const baseIndianPrice = getGeoPrice(product.adminPrice, 'IN');

            let unitPrice = baseGeoPrice;
            let sellerUnitPrice = product.sellerPrice || baseIndianPrice;

            // Handle tiered pricing
            let weight = product.weight || 0.5;
            let length = product.dimensions?.length || 10;
            let breadth = product.dimensions?.breadth || 10;
            let height = product.dimensions?.height || 10;

            let currentMoq = product.moq || 1;

            if (product.tieredPricing && product.tieredPricing.length > 0) {
                const sorted = [...product.tieredPricing].sort((a, b) => b.moq - a.moq);
                const tier = sorted.find(t => item.quantity >= t.moq);
                if (tier) {
                    const scaleFactor = (baseIndianPrice > 0) ? (baseGeoPrice / baseIndianPrice) : 1;
                    unitPrice = tier.price * scaleFactor;
                    const sellerRatio = (baseIndianPrice > 0) ? (product.sellerPrice / baseIndianPrice) : 1;
                    sellerUnitPrice = tier.price * sellerRatio;

                    if (tier.weight) weight = tier.weight;
                    if (tier.length) length = tier.length;
                    if (tier.breadth) breadth = tier.breadth;
                    if (tier.height) height = tier.height;
                    if (tier.moq) currentMoq = tier.moq;
                }
            }

            const ratio = item.quantity / currentMoq;

            console.log(`Product: ${product.title} | Country: ${countryKey} | Unit: ${unitPrice} | Target Drop PIN: ${shippingAddress?.pinCode}`);

            const lineAmount = unitPrice * item.quantity;
            const lineAmountWithGst = lineAmount * (1 + (product.gstPercentage || 0) / 100);

            const sellerLineAmount = sellerUnitPrice * item.quantity;
            const sellerEarning = sellerLineAmount * (1 + (product.gstPercentage || 0) / 100);

            const adminCommission = lineAmountWithGst - sellerEarning;

            totalPayable += lineAmountWithGst;

            const itemTotalWeight = weight * ratio;

            const groupKey = `${item.productId}_${Math.random().toString(36).substr(2, 9)}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    pickupPincode: pickupPincode,
                    totalWeight: 0,
                    length: 0,
                    breadth: 0,
                    height: 0,
                    totalDeclaredValue: 0, // INR value for Shiprocket declared_value
                    shippingFeeForGroup: 0,
                    linkedItemIds: [] // to link back to processedItem
                };
            }
            groups[groupKey].totalWeight += itemTotalWeight;
            groups[groupKey].length = Math.max(groups[groupKey].length, length);
            groups[groupKey].breadth = Math.max(groups[groupKey].breadth, breadth);
            groups[groupKey].height += height * Math.ceil(ratio);
            // Declared value must be in INR (Shiprocket is India-based)
            // CHECK FOR MISSING DIMENSIONS
            const hasDimensions = product.dimensions?.length && product.dimensions?.breadth && product.dimensions?.height;
            if (!hasDimensions) {
                groups[groupKey].isInvalidShipping = true;
            }

            processedItems.push({
                ...item,
                product,
                pickupPincode,
                groupKey,
                itemTotalWeight,
                lineAmountWithGst,
                sellerEarning,
                adminCommission
            });
            groups[groupKey].linkedItemIds.push(processedItems.length - 1);
        }

        // 2. Second pass: Calculate shipping individually per item
        if (shippingAddress && shippingAddress.pinCode) {
            const destinationCountry = (shippingAddress?.country || 'India').trim();
            const isInternational = destinationCountry !== 'India';
            const cleanDeliveryPincode = isInternational
                ? shippingAddress.pinCode
                : shippingAddress.pinCode.toString().replace(/\D/g, '').slice(0, 6);

            // International flat rate constants (INR)
            const INTL_BASE_RATE_INR = 1500;
            const INTL_PER_KG_RATE_INR = 800;

            for (const groupKey in groups) {
                const group = groups[groupKey];

                if (group.isInvalidShipping) {
                    console.log(`[Checkout Shipping] Skipping Shiprocket for group ${groupKey} due to missing dimensions.`);
                    group.shippingFeeForGroup = 0;
                    continue;
                }

                const pickupPincode = group.pickupPincode;

                // volumetric weight
                const volumetricWeight = (group.length * group.breadth * group.height) / 5000;

                // courier uses higher value
                const chargeableWeight = Math.max(group.totalWeight, volumetricWeight);

                console.log(`[Checkout Weight]
Actual: ${group.totalWeight}
Volumetric: ${volumetricWeight}
Chargeable: ${chargeableWeight}`);

                group.totalWeight = chargeableWeight;
                console.log(`[Checkout Shipping] Pickup:${pickupPincode} | Drop:${cleanDeliveryPincode} | Weight:${group.totalWeight}kg | Country:${destinationCountry}`);

                if (isInternational) {
                    // Shiprocket serviceability API doesn't handle non-Indian pincodes.
                    // Apply flat international rate: base + per-kg charge.
                    group.shippingFeeForGroup = Math.ceil(INTL_BASE_RATE_INR + (group.totalWeight * INTL_PER_KG_RATE_INR));
                    console.log(`[Checkout Shipping] International rate applied: ₹${group.shippingFeeForGroup} for ${destinationCountry}`);
                } else {
                    try {
                        const serviceability = await shiprocket.checkServiceability(
                            pickupPincode,
                            cleanDeliveryPincode,
                            group.totalWeight,
                            group.length || 10,
                            group.breadth || 10,
                            group.height || 10,
                            0,                       // cod = 0 (prepaid)
                            group.totalDeclaredValue // declared_value for accurate rates
                        );
                        if (!serviceability.error && serviceability.status === 200 && serviceability.data?.available_courier_companies?.length > 0) {
                            const couriers = serviceability.data.available_courier_companies;
                            const getEffectiveRate = (c) => Number(c.et_total_amount ?? c.freight_charge ?? c.rate ?? 999999);
                            const getChargeWeight = (c) => Number(c.charge_weight ?? c.min_weight ?? 999);

                            const minChargeWeight = Math.min(...couriers.map(getChargeWeight));
                            const closestWeightCouriers = couriers.filter(c => getChargeWeight(c) <= minChargeWeight * 1.5 + 1);

                            const sorted = [...closestWeightCouriers].sort((a, b) => getEffectiveRate(a) - getEffectiveRate(b));
                            const cheapest = sorted[0] || couriers.sort((a, b) => getEffectiveRate(a) - getEffectiveRate(b))[0];

                            group.shippingFeeForGroup = Math.ceil(getEffectiveRate(cheapest));
                            console.log(`[Checkout Shipping] All couriers (sorted cheapest first) for ${pickupPincode} → ${cleanDeliveryPincode} @ ${group.totalWeight}kg:`);
                            sorted.forEach((c, i) => {
                                console.log(`  [${i + 1}] ${c.courier_name} | total:₹${c.et_total_amount} | freight:₹${c.freight_charge} | rate:₹${c.rate} | min_wt:${c.min_weight}`);
                            });
                            console.log(`[Checkout Shipping] ✔ Selected: ${cheapest.courier_name} @ ₹${group.shippingFeeForGroup}`);
                        } else {
                            group.shippingFeeForGroup = 100; // fallback
                            const reason = serviceability.error ? serviceability.message : 'No couriers available';
                            console.warn(`[Checkout Shipping] No couriers for ${pickupPincode} → ${cleanDeliveryPincode}. Reason: ${reason}. Using ₹100 fallback.`);
                        }
                    } catch (err) {
                        console.error(`[Checkout Shipping] Failed for pickup PIN ${pickupPincode}:`, err.message || err);
                        group.shippingFeeForGroup = 100;
                    }
                }
                totalShippingFeesInINR += group.shippingFeeForGroup;
            }
        }

        // 3. Third pass: Assign fractional shipping and push OrderDocs
        for (const pItem of processedItems) {
            const group = groups[pItem.groupKey];

            // Distribute shipping cost to this specific item. Since group corresponds to a single cart item now, 
            // the full shipping fee of the group goes to this item.
            const shippingForThisItem = group.shippingFeeForGroup;

            orderDocs.push({
                buyerId: req.user.id,
                productId: pItem.productId,
                quantity: pItem.quantity,
                selectedVariation: pItem.selectedVariation,
                totalAmount: Math.round(pItem.lineAmountWithGst), // Storing rounded value
                shippingCharges: shippingForThisItem,
                adminCommission: Math.round(pItem.adminCommission),
                sellerEarning: Math.round(pItem.sellerEarning),
                paymentStatus: 'pending',
                orderStatus: 'awaiting_payment',
                logisticsStatus: 'pending',
                paymentGateway: 'easebuzz',
                easebuzzTransactionId: txnid,
                countryKey: countryKey,
                shippingAddress
            });
        }

        // 4. Save all orders
        await Order.insertMany(orderDocs);

        // Easebuzz only accepts INR. Convert the final amount (which may be in USD, GBP, etc.) to INR.
        const EXCHANGE_RATES_TO_INR = {
            'IN': 1,
            'US': 84.50, // 1 USD = 84.50 INR
            'UK': 105.00, // 1 GBP = 105.00 INR
            'CA': 61.00, // 1 CAD = 61.00 INR
            'AU': 54.50, // 1 AUD = 54.50 INR
            'UAE': 23.00 // 1 AED = 23.00 INR
        };

        const conversionRate = EXCHANGE_RATES_TO_INR[countryKey] || 84.50; // Fallback to US rate if unknown
        const amountInINR = totalPayable * conversionRate;
        const totalAmountInINRWithShipping = amountInINR + totalShippingFeesInINR;
        const amount = totalAmountInINRWithShipping.toFixed(2);

        const baseUrl = 'https://savvy-backend-api.vercel.app';


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
                return res.redirect('https://savvy-frontend-web.vercel.app/success');
            } else {
                console.error(`Orders not found for transaction ${txnid}`);
                return res.redirect('https://savvy-frontend-web.vercel.app/cart?error=order_not_found');
            }
        } else {
            // Payment Failed
            console.log(`Payment failed for transaction ${txnid}`);
            await Order.deleteMany({ easebuzzTransactionId: txnid }); // Cleanup
            return res.redirect('https://savvy-frontend-web.vercel.app/cart?error=payment_failed');
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
        let query = { paymentStatus: "completed" }; // only completed payments

        if (req.user.role === 'buyer') {
            query.buyerId = req.user.id;
        }
        else if (req.user.role === 'seller') {
            const myProducts = await Product.find({ sellerId: req.user.id }).select('_id');

            query.productId = { $in: myProducts.map(p => p._id) };
        }

        const orders = await Order.find(query)
            .populate('productId')
            .populate('buyerId', 'name email');

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
                        <form action="https://savvy-backend-api.vercel.app/api/orders/easebuzz-callback" method="POST" name="payform">
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
        const orders = await Order.find({ orderStatus: { $ne: 'cancelled' }, paymentStatus: 'completed' })
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
