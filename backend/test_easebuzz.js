require('dotenv').config();
const { generateHash } = require('./utils/easebuzz');

async function testEasebuzz() {
    const txnid = 'MOCK_' + Date.now();
    const data = {
        key: process.env.EASEBUZZ_KEY,
        txnid,
        amount: '100.00',
        productinfo: 'Test Product',
        firstname: 'Test Name',
        email: 'test@example.com',
        phone: '9999999999',
        surl: 'http://localhost/success',
        furl: 'http://localhost/fail',
        udf1: '', udf2: '', udf3: '', udf4: '', udf5: ''
    };

    const hash = generateHash(data);
    data.hash = hash;

    const formData = new URLSearchParams(data);
    const easebuzzUrl = process.env.EASEBUZZ_ENV === 'prod'
        ? 'https://pay.easebuzz.in/payment/initiateLink'
        : 'https://testpay.easebuzz.in/payment/initiateLink';

    console.log('Request to:', easebuzzUrl);
    console.log('Data:', data);

    try {
        const response = await fetch(easebuzzUrl, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const result = await response.json();
        console.log('Result:', result);
    } catch (err) {
        console.error('Error:', err);
    }
}

testEasebuzz();
