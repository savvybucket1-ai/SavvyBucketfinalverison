const axios = require('axios');

const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in/v1/external';

// Simple in-memory cache for token
let srToken = null;
let tokenExpiry = null;

async function getAuthToken() {
    // If we have a token and it expires more than 1 hour from now, use it
    if (srToken && tokenExpiry && Date.now() < tokenExpiry - 3600000) {
        return srToken;
    }

    let email = process.env.SHIPROCKET_EMAIL;
    let password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
        throw new Error('ShipRocket credentials not set in environment variables');
    }

    // Strip surrounding quotes that dotenv sometimes preserves (e.g. PASSWORD="abc" → "abc" with quotes)
    email = email.replace(/^"|"$/g, '').trim();
    password = password.replace(/^"|"$/g, '').trim();

    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/auth/login`, {
            email,
            password
        });
        srToken = response.data.token;
        // ShipRocket tokens typically expire in 10 days, cache for 23 hours to be safe
        tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
        console.log('[ShipRocket] Auth token refreshed successfully');
        return srToken;
    } catch (err) {
        // Invalidate any stale cached token so the next call retries auth
        srToken = null;
        tokenExpiry = null;
        const detail = err.response?.data || err.message;
        console.error('[ShipRocket Auth Error]', detail);
        throw new Error(`ShipRocket authentication failed: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
    }
}

async function createOrder(orderPayload) {
    const token = await getAuthToken();
    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/orders/create/adhoc`, orderPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Create Order API Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

async function checkServiceability(pickupPincode, deliveryPincode, weight, length = 10, breadth = 10, height = 10, cod = 0, declaredValue = 0) {
    try {
        const token = await getAuthToken();

        const params = {
            pickup_postcode: String(pickupPincode).trim(),
            delivery_postcode: String(deliveryPincode).trim(),
            cod: Number(cod) || 0,
            weight: Number(weight) || 0.5,
            length: Number(length) || 10,
            breadth: Number(breadth) || 10,
            height: Number(height) || 10,
            is_return: 0
        };

        if (declaredValue && Number(declaredValue) > 0) {
            params.declared_value = Number(declaredValue);
        }

        console.log('[ShipRocket Serviceability] Request Params:', JSON.stringify(params));

        const response = await axios.get(`${SHIPROCKET_API_BASE}/courier/serviceability/`, {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });

        // Log every courier returned so we can debug rate differences
        const couriers = response.data?.data?.available_courier_companies || [];
        if (couriers.length > 0) {
            console.log(`[ShipRocket Serviceability] ${couriers.length} couriers returned:`);
            couriers.forEach((c, i) => {
                console.log(`  [${i + 1}] ${c.courier_name} | rate:${c.rate} | freight_charge:${c.freight_charge} | min_weight:${c.min_weight} | charge_weight:${c.charge_weight}`);
            });
        } else {
            console.warn('[ShipRocket Serviceability] No couriers returned in response.');
        }

        return response.data;
    } catch (err) {
        const detail = err.response?.data || err.message;
        console.error('[ShipRocket Serviceability Error]', detail);
        return {
            status: err.response?.status || 500,
            error: true,
            message: typeof detail === 'object' ? JSON.stringify(detail) : detail
        };
    }
}

async function generateAWB(shipmentId) {
    const token = await getAuthToken();
    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/courier/assign/awb`, {
            shipment_id: shipmentId
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket AWB Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

async function requestPickup(shipmentId) {
    const token = await getAuthToken();
    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/courier/generate/pickup`, {
            shipment_id: [shipmentId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Pickup Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

async function generateLabel(shipmentId) {
    const token = await getAuthToken();
    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/courier/generate/label`, {
            shipment_id: [shipmentId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Label Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

async function generateManifest(shipmentId) {
    const token = await getAuthToken();
    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/manifests/print`, {
            shipment_id: [shipmentId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Manifest Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

async function trackShipment(awb) {
    const token = await getAuthToken();
    try {
        const response = await axios.get(`${SHIPROCKET_API_BASE}/courier/track/awb/${awb}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Track Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

async function getOrderDetails(orderId) {
    const token = await getAuthToken();
    try {
        const response = await axios.get(`${SHIPROCKET_API_BASE}/orders/show/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Get Order Details Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
    }
}

module.exports = {
    createOrder,
    checkServiceability,
    generateAWB,
    requestPickup,
    generateLabel,
    generateManifest,
    trackShipment,
    getOrderDetails
};
