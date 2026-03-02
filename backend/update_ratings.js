const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/savvybucket';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);

        for (const p of products) {
            // Random rating between 3 and 5 (integer)
            const randomRating = Math.floor(Math.random() * 3) + 3;
            // Random reviews between 10 and 500
            const randomReviews = Math.floor(Math.random() * 490) + 10;

            p.rating = randomRating;
            p.reviewsCount = randomReviews;
            await p.save();
            console.log(`Updated "${p.title}": Rating ${p.rating}, Reviews ${p.reviewsCount}`);
        }

        console.log('Done updating ratings.');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
