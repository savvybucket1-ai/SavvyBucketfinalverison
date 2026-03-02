const mongoose = require('mongoose');

const uri = "mongodb+srv://savvybucket1_db_user:g9yms6Qw0kL7Idd8@cluster0.8f2vsea.mongodb.net/savvybucket";

console.log("Attempting to connect to:", uri);

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => {
        console.log("SUCCESS: Connected to MongoDB Atlas!");
        process.exit(0);
    })
    .catch(err => {
        console.error("FAILURE: Could not connect.");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.reason) console.error("Reason:", err.reason);
        console.log("\nIf the error is 'MongoServerSelectionError', it usually means IP Whitelist is blocking access.");
        process.exit(1);
    });
