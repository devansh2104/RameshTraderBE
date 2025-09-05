// Cloudinary configuration for image uploads
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Debug Cloudinary configuration
console.log('🔧 Cloudinary Config Debug:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '***SET***' : 'NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'NOT SET');
console.log('CLOUDINARY_UPLOAD_FOLDER:', process.env.CLOUDINARY_UPLOAD_FOLDER || 'rameshtraders');

// Configure Cloudinary with environment variables 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage for multer
// Use dynamic params so we can switch between image and video based on req.body.type
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const type = (req && req.body && String(req.body.type || 'photo').toLowerCase()) === 'video' ? 'video' : 'image';
    const folderBase = process.env.CLOUDINARY_UPLOAD_FOLDER || 'rameshtraders';
    const folder = type === 'video' ? `${folderBase}/videos` : `${folderBase}/images`;

    // allowed formats per resource type
    const allowedForImages = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedForVideos = ['mp4', 'mov', 'webm'];

    return {
      folder,
      resource_type: type, // 'image' or 'video'
      allowed_formats: type === 'video' ? allowedForVideos : allowedForImages
    };
  }
});

module.exports = { storage };

/*
Cloudinary configuration file for image upload functionality.
This file sets up Cloudinary integration for storing images in the cloud.
Features:
- Environment-based Cloudinary credentials
- Multer storage configuration for file uploads
- Support for multiple image formats
- Upload folder is configurable via CLOUDINARY_UPLOAD_FOLDER env variable (default: rameshtraders)
- Shared storage instance for all routes
*/ 