const mongoose = require('mongoose');
const shiprocket = require('./utils/shiprocket');
require('dotenv').config();

async function test() {
    try {
        const response = await shiprocket.checkServiceability(
            '121004', '641001', 1.19, 31, 16, 12, 1, 213
        );
        console.log("Raw Response:");
        const couriers = response.data?.available_courier_companies || [];
        const sorted = [...couriers].sort((a, b) => {
            const chargeA = a.et_total_amount ?? a.freight_charge ?? a.rate ?? 999999;
            const chargeB = b.et_total_amount ?? b.freight_charge ?? b.rate ?? 999999;
            return Number(chargeA) - Number(chargeB);
        });
        console.log("Couriers:");
        console.log("Full Object for Xpressbees:", sorted[0]);
    } catch (err) {
        console.error("Err", err);
    }
}
test();
