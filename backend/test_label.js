require('dotenv').config();
const { generateLabel } = require('./utils/shiprocket');

async function testLabel() {
    try {
        const res = await generateLabel('1201887092'); // from the image
        console.log("Generate Label Response:", res);
    } catch (err) {
        console.error("Error:", err);
    }
}
testLabel();
