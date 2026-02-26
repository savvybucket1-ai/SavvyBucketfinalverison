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

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
        throw new Error('ShipRocket credentials not set in environment variables');
    }

    try {
        const response = await axios.post(`${SHIPROCKET_API_BASE}/auth/login`, {
            email,
            password
        });
        srToken = response.data.token;
        // ShipRocket tokens typically expire in 10 days, let's play it safe and cache for 24 hours
        tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
        return srToken;
    } catch (err) {
        console.error('[ShipRocket Auth Error]', err.response?.data || err.message);
        throw new Error('Authentication failed');
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

async function checkServiceability(pickupPincode, deliveryPincode, weight, cod = 0) {
    const token = await getAuthToken();
    try {
        const response = await axios.get(`${SHIPROCKET_API_BASE}/courier/serviceability/`, {
            params: {
                pickup_postcode: pickupPincode,
                delivery_postcode: deliveryPincode,
                cod,
                weight
            },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (err) {
        console.error('[ShipRocket Serviceability Error]', err.response?.data || err.message);
        throw err.response?.data || err.message;
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
        const response = await axios.post(`${SHIPROCKET_API_BASE}/manifests/generate`, {
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
