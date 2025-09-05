// Banner routes for CRUD operations
const express = require('express');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');
const path = require('path');
const bannerController = require('../controllers/bannerController');

const router = express.Router();

// Use shared Cloudinary storage for image upload
const upload = multer({ storage });

// CRUD routes for banners
router.get('/', bannerController.getAllBanners);
router.get('/count/total', bannerController.getBannersCount);
router.get('/count/active', bannerController.getActiveBannersCount);
router.get('/:id', bannerController.getBannerById);
router.post('/', upload.single('image'), bannerController.createBanner);
router.put('/:id', upload.single('image'), bannerController.updateBanner);
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;

/*
Banner routes for promotional content management.
This file sets up Express routes for banner operations with image upload support.
Features:
- Banner creation with image upload
- Complete CRUD operations for banner management
- Cloudinary integration for image storage
- Active/inactive status management
*/ 