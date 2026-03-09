const axios = require('axios');

async function testVercel() {
    try {
        const res = await axios.post('https://savvy-backend-api.vercel.app/api/orders/create-easebuzz-session', {
            items: [{ productId: 'test', quantity: 1 }],
            shippingAddress: {}
        }, {
            headers: {
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.12345`
            }
        });
        console.log(res.data);
    } catch (err) {
        console.log("Status:", err.response?.status);
        console.log("Data:", err.response?.data);
    }
}
testVercel();
