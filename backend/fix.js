const mongoose = require('mongoose');
const Order = require('./models/Order');
const Shipment = require('./models/Shipment');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://savvybucket1_db_user:g9yms6Qw0kL7Idd8@cluster0.8f2vsea.mongodb.net/savvybucket').then(async () => {
    console.log('Connected to DB');

    // Find all shipments with Canceled status in our DB
    const canceledShipments = await Shipment.find({ status: { $in: ['Canceled', 'CANCELED', 'cancelled', 'Cancelled'] } });
    console.log('Cancelled shipments found:', canceledShipments.length);

    for (const s of canceledShipments) {
        const o = await Order.findById(s.orderId);
        if (o && o.logisticsStatus !== 'cancelled') {
            o.logisticsStatus = 'cancelled';
            o.orderStatus = 'cancelled';
            await o.save();
            console.log('Fixed Order:', o._id.toString(), 'was:', o.logisticsStatus);
        } else if (o) {
            console.log('Order already cancelled:', o._id.toString());
        }
    }

    // Also fix by shiprocketOrderId for any missed ones
    // Order #413f1b = 69a027a0115d1dab91413f1b
    const specificIds = [
        '69a027a0115d1dab91413f1b',
        '699fed4ac2a9d0cc99586aae',
        '699fdfb45090c05b8f5ee574',
        '699fe64ca58d3336db3f7a64'
    ];

    for (const id of specificIds) {
        const o = await Order.findById(id);
        if (o && o.logisticsStatus !== 'cancelled') {
            o.logisticsStatus = 'cancelled';
            o.orderStatus = 'cancelled';
            await o.save();
            console.log('Force Fixed Order:', id);
        } else if (o) {
            console.log('Already correct:', id, o.logisticsStatus);
        }
    }

    console.log('All done!');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
