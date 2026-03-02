const mongoose = require('mongoose');
const Product = require('./backend/models/Product');

mongoose.connect('mongodb://localhost:27017/savvybucket')
    .then(async () => {
        console.log('Connected to MongoDB');

        const approvedCount = await Product.countDocuments({ status: 'approved' });
        console.log(`Found ${approvedCount} approved products.`);

        if (approvedCount > 0) {
            // Mark up to 5 random approved products as trending
            const products = await Product.find({ status: 'approved' }).limit(5);
            for (const p of products) {
                p.isTrending = true;
                await p.save();
                console.log(`Marked "${p.title}" as Trending`);
            }
        } else {
            console.log('No approved products found to mark as trending.');
        }

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
