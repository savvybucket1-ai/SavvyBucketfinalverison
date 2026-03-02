require('dotenv').config();
const { generateManifest } = require('./utils/shiprocket');

async function testManifest() {
    try {
        // Find a recent shipment ID or we can just try passing an invalid one to see the error,
        // or a valid one.
        const res = await generateManifest('1201887092'); // from the image
        console.log("Generate Manifest Response:", res);
    } catch (err) {
        console.error("Error:", err);
    }
}
testManifest();
