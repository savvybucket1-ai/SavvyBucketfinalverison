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

const BASE_URL = 'https://savvy-backend-hazel.vercel.app/api';
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
        console.log('--- STARTING VERIFICATION (Vercel Mode) ---');
        console.log(`Target: ${BASE_URL}`);

        // 0. Seed Admin (Ensure Admin Exists)
        console.log('0. Seeding Admin User...');
        try {
            await request(`${BASE_URL}/auth/seed-admin`, 'GET');
            console.log('   Admin seeded/verified successfully.');
        } catch (e) {
            console.warn('   Seed warning:', e.message);
        }

        // 1. Login Admin
        console.log('1. Logging in Admin...');
        await new Promise(r => setTimeout(r, 1000)); // Brief pause
        try {
            const data = await request(`${BASE_URL}/auth/login`, 'POST', {
                email: 'admin@savvybucket12.com',
                password: 'admin12'
            });
            adminToken = data.token;
            console.log('   SUCCESS: Admin logged in.');
            console.log(`   Token: ${adminToken.substring(0, 20)}...`);
        } catch (e) {
            console.error('   FAILED: Admin login failed.', e.message);
            return; // Stop if admin cannot login
        }

        // 2. Admin fetching Sellers list
        console.log('2. Admin fetching Sellers list...');
        try {
            const sellers = await request(`${BASE_URL}/auth/sellers`, 'GET', null, adminToken);
            if (Array.isArray(sellers)) {
                console.log(`   SUCCESS: Fetched ${sellers.length} sellers.`);
            } else {
                console.error('   FAILED: Sellers response not an array.');
            }
        } catch (e) {
            console.error('   FAILED: Could not fetch sellers.', e.message);
        }

        // 3. Admin Updates Commission (Test PUT)
        console.log('3. Admin updating Commission Settings...');
        try {
            const settings = await request(`${BASE_URL}/settings`, 'PUT', {
                key: 'default_commission',
                value: 20,
                description: 'Test Commission Updated By Verifier'
            }, adminToken);

            if (settings && settings.value === 20) {
                console.log('   SUCCESS: Commission updated to 20%.');
            } else {
                console.log('   Warning: Commission update response unexpected:', settings);
            }
        } catch (e) {
            console.error('   FAILED: Settings update failed.', e.message);
        }

        console.log('--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('FATAL SYSTEM ERROR:', err.message);
    }
}

run();
