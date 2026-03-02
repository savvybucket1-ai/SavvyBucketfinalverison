require('dotenv').config();
const { createOrder } = require('./utils/shiprocket');

async function testCreateOrder() {
    try {
        console.log("Testing create order auth...");
        // Just send a dummy payload, it will 400 or 422 if auth succeeds but payload fails
        // but if auth fails, it will throw an auth error.
        await createOrder({});
    } catch (e) {
        console.log("Result:", e.message || e);
    }
}
testCreateOrder();
