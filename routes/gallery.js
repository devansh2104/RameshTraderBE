// Gallery routes for CRUD operations
const express = require('express');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');
const path = require('path');
const galleryController = require('../controllers/galleryController');

const router = express.Router();

// Use shared Cloudinary storage for image/video upload with validation
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const type = (req.body && String(req.body.type || 'photo').toLowerCase()) === 'video' ? 'video' : 'photo';
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (type === 'video') {
      if (isVideo) return cb(null, true);
      return cb(new Error('Only video files are allowed when type=video'));
    }
    // default photo
    if (isImage) return cb(null, true);
    return cb(new Error('Only image files are allowed when type=photo'));
  },
  limits: {
    // sizes in bytes (images ~10MB, videos ~200MB default). Multer can't vary by request here
    fileSize: 200 * 1024 * 1024
  }
});

// CRUD routes for gallery  
router.get('/', galleryController.getAllImages);
router.get('/count/total', galleryController.getImagesCount);
router.get('/:id', galleryController.getImageById);
router.post('/', upload.single('image'), galleryController.createImage);
router.put('/:id', upload.single('image'), galleryController.updateImage);
router.delete('/:id', galleryController.deleteImage);

module.exports = router;

/*
Gallery routes for image management.
This file sets up Express routes for gallery operations with image upload support.
Features:
- Image creation with Cloudinary upload
- Complete CRUD operations for gallery management
- Cloudinary integration for image storage
- Image metadata management
*/ 