const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const prod = await Product.findOne({});
        console.log("Sample product format:", JSON.stringify(prod, null, 2));
        mongoose.connection.close();
    });
