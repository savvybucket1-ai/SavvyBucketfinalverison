require('dotenv').config();
const axios = require('axios');

async function testPrintManifest() {
    try {
        const email = process.env.SHIPROCKET_EMAIL;
        const password = process.env.SHIPROCKET_PASSWORD;
        const authRes = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', { email, password });
        const token = authRes.data.token;

        const res = await axios.post('https://apiv2.shiprocket.in/v1/external/manifests/print', {
            shipment_id: ["1201887092"]
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Print Manifest Response:", res.data);
    } catch (err) {
        console.error("Print Manifest API Error:", err.response?.data || err.message);
    }
}
testPrintManifest();
