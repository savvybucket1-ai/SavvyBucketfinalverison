require('dotenv').config();
const axios = require('axios');

async function testShiprocketAuth() {
    const email = process.env.SHIPROCKET_EMAIL;
    // dotenv might include or strip quotes. Let's trace it out.
    let password = process.env.SHIPROCKET_PASSWORD;
    console.log("Original Extracted Password:", password, typeof password);
    console.log("Email:", email);

    try {
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email,
            password
        });
        console.log("Auth Success:", Object.keys(response.data));
    } catch (err) {
        console.error("Auth Fail Original:", err.response?.data?.message || err.message);
        try {
            // Try with potential parsed version if it wasn't
            let strippedPassword = password.replace(/^"|"$/g, '');
            console.log("Stripped password:", strippedPassword);
            const response2 = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
                email,
                password: strippedPassword
            });
            console.log("Auth Success with Stripped:", Object.keys(response2.data));
        } catch (err2) {
            console.error("Auth Fail Stripped:", err2.response?.data?.message || err2.message);
        }
    }
}
testShiprocketAuth();
