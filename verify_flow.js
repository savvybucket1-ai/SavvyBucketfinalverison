const fs = require('fs');
const path = require('path');

// Simple .env parser since we can't depend on dotenv
function loadEnv() {
    try {
        const envPath = 'c:/Savvybucket/backend/.env';
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    } catch (e) {
        console.log('Could not load .env file, relying on defaults');
    }
}
loadEnv();

const BASE_URL = 'http://localhost:5000/api';
let sellerToken, adminToken;

async function request(url, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-auth-token'] = token;

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    };

    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || res.statusText);
    return data;
}

async function run() {
    try {
        console.log('--- STARTING VERIFICATION (Fetch Mode) ---');

        // 1. Login/Register Seller
        console.log('1. Registering/Logging in Seller...');
        try {
            const data = await request(`${BASE_URL}/auth/login`, 'POST', {
                email: 'seller_test@example.com',
                password: 'password123'
            });
            sellerToken = data.token;
            console.log('   Seller logged in.');
        } catch (e) {
            await request(`${BASE_URL}/auth/register`, 'POST', {
                name: 'Test Seller',
                email: 'seller_test@example.com',
                password: 'password123',
                role: 'seller'
            });
            console.log('   Seller registered.');
            const data = await request(`${BASE_URL}/auth/login`, 'POST', {
                email: 'seller_test@example.com',
                password: 'password123'
            });
            sellerToken = data.token;
        }

        // 2. Login/Register Admin
        console.log('2. Registering/Logging in Admin...');
        try {
            const data = await request(`${BASE_URL}/auth/login`, 'POST', {
                email: 'admin_test@example.com',
                password: 'password123'
            });
            adminToken = data.token;
            console.log('   Admin logged in.');
        } catch (e) {
            await request(`${BASE_URL}/auth/register`, 'POST', {
                name: 'Test Admin',
                email: 'admin_test@example.com',
                password: 'password123',
                role: 'admin'
            });
            console.log('   Admin registered.');
            const data = await request(`${BASE_URL}/auth/login`, 'POST', {
                email: 'admin_test@example.com',
                password: 'password123'
            });
            adminToken = data.token;
        }

        // 3. Admin fetching Sellers list
        console.log('3. Admin fetching Sellers list...');
        const sellers = await request(`${BASE_URL}/auth/sellers`, 'GET', null, adminToken);
        if (Array.isArray(sellers)) {
            console.log(`   SUCCESS: Fetched ${sellers.length} sellers.`);
        } else {
            console.error('   FAILED: Sellers response not an array.');
        }

        // 4. Admin Updates Commission
        console.log('4. Admin updating Commission Settings...');
        const settings = await request(`${BASE_URL}/settings`, 'PUT', {
            key: 'default_commission',
            value: 20,
            description: 'Test Commission Updated'
        }, adminToken);

        if (settings.value === 20) {
            console.log('   SUCCESS: Commission updated to 20%.');
        } else {
            console.error('   FAILED: Commission not updated.');
        }

        // 5. Seller Checking Orders (Empty)
        console.log('5. Seller checking orders...');
        const orders = await request(`${BASE_URL}/orders/my-orders`, 'GET', null, sellerToken);
        if (Array.isArray(orders)) {
            console.log(`   SUCCESS: Fetched ${orders.length} orders (Empty is expected).`);
        } else {
            console.error('   FAILED: Orders response not an array.');
        }

        console.log('--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('FATAL ERROR:', err.message);
    }
}

run();
