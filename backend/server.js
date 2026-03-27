require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');

const app = express();
app.enable('trust proxy'); // Important for Vercel/proxies to detect HTTPS

// Add Request Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
    origin: ['https://www.savvybucket.com', 'https://savvy-frontend-api.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    credentials: true
}));
const os = require('os');
const path = require('path');

// Serve uploaded files
// Priority 1: Local 'uploads' folder (for local dev)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Priority 2: System Temp Dir (for Vercel fallback/serverless)
app.use('/uploads', express.static(os.tmpdir()));

// Log Storage Mode for Debugging
if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Storage Mode: Cloudinary (Persistent)');
} else {
    console.log('Storage Mode: Temporary/Local (Ephemeral). Images may disappear on Vercel.');
}

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swaggerConfig');

// Fix for Vercel deployment: Serve Swagger assets from CDN
const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
const JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js";
const PRESET_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js";

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    customCssUrl: CSS_URL,
    customJs: [JS_URL, PRESET_URL]
}));

// MongoDB Connection Strategy for Serverless
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable mongoose buffering
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
            console.log('MongoDB connected');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        // Expose detailed error for debugging
        res.status(500).json({
            error: 'Database connection failed',
            details: error.message,
            reason: error.reason ? error.reason : 'Unknown',
            mongoUriSet: !!process.env.MONGO_URI // Check if env var is actually read
        });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/influencer-videos', require('./routes/influencerVideos'));
app.use('/api/china-inquiry', require('./routes/chinaInquiry'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
