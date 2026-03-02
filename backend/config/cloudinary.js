const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim() : '',
    api_key: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim() : '',
    api_secret: process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim() : '',
    secure: true
});

// Configure Storage
// We can create different storages for different folders if needed
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'savvy_bucket_products', // The name of the folder in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Resize big images
    }
});

const videoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'savvy_bucket_videos',
        resource_type: 'video', // Explicitly set for videos
        allowed_formats: ['mp4', 'mov', 'webm']
    }
});

const docStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isPdf = file.mimetype === 'application/pdf';

        return {
            folder: 'savvy_bucket_docs',
            resource_type: isPdf ? 'raw' : 'image',
            allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx']
        };
    }
});

module.exports = {
    cloudinary,
    storage,
    videoStorage,
    docStorage
};
