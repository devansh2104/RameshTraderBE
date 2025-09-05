// Category routes for CRUD operations
const express = require('express');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');
const path = require('path');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// Use shared Cloudinary storage for image upload
const upload = multer({ storage });

// CRUD routes for categories
router.get('/', categoryController.getAllCategories);
// Get categories count
router.get('/count/total', categoryController.getCategoriesCount);
// Get active categories count
router.get('/count/active', categoryController.getActiveCategoriesCount);
router.get('/with-services', categoryController.getCategoriesWithServices);
router.get('/with-items', categoryController.getCategoriesWithItems);
router.get('/:id/services', categoryController.getCategoryServices);
router.get('/:id/items', categoryController.getCategoryItems);
router.post('/add-service', categoryController.addServiceToCategory);
router.post('/add-item', categoryController.addItemToCategory);
router.delete('/:category_id/services/:service_id', categoryController.removeServiceFromCategory);
router.delete('/:category_id/items/:item_id', categoryController.removeItemFromCategory);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id', categoryController.getCategoryById);
router.post('/', upload.single('image'), categoryController.createCategory);
router.put('/:id', upload.single('image'), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;

/*
Category routes for product/service categorization.
This file sets up Express routes for category operations with image upload support.
Features:
- Category creation with image upload
- Complete CRUD operations for category management
- Cloudinary integration for image storage
- Active/inactive status management
*/ 