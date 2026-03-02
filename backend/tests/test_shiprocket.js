require('dotenv').config();
const shiprocket = require('../utils/shiprocket'); // Fixed path

(async () => {
    console.log('--- Testing Shiprocket Integration ---');

    try {
        console.log('1. Testing Authentication...');

        console.log('2. Testing Serviceability Check...');
        // Pickup: 110001 (Delhi), Delivery: 400001 (Mumbai)
        try {
            const serviceability = await shiprocket.checkServiceability('110001', '400001', 0.5, 0);
            console.log('Serviceability Check Success!');
            if (serviceability.data && serviceability.data.available_courier_companies) {
                console.log(`Available Couriers: ${serviceability.data.available_courier_companies.length}`);
            } else {
                console.log('Response received but no courier companies data found (might be authentication issue or invalid pincode).');
                console.log('Full Response:', JSON.stringify(serviceability, null, 2));
            }
        } catch (err) {
            console.error('Serviceability Check Failed:', err.message || err);
            if (err.response) {
                console.error('Response Data:', err.response.data);
            }
        }

    } catch (error) {
        console.error('Shiprocket Test Failed:', error);
    }
})();
