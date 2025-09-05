// Item routes for CRUD operations
const express = require('express');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');
const path = require('path');
const itemController = require('../controllers/itemController');

const router = express.Router();

// Use shared Cloudinary storage for image upload
const upload = multer({ storage });

// CRUD routes for items
router.get('/', itemController.getAllItems);
// Get items count
router.get('/count/total', itemController.getItemsCount);
// Get active items count
router.get('/count/active', itemController.getActiveItemsCount);
// Get low stock items count
router.get('/count/low-stock', itemController.getLowStockItemsCount);
// Get items with their categories
router.get('/with-categories', itemController.getItemsWithCategories);
// Get categories for a specific item
router.get('/:id/categories', itemController.getItemCategories);
// Add item to category
router.post('/add-to-category', itemController.addItemToCategory);
// Remove item from category
router.delete('/:item_id/categories/:category_id', itemController.removeItemFromCategory);
router.get('/slug/:slug', itemController.getItemBySlug);
router.get('/:id', itemController.getItemById);
router.post('/', upload.single('image'), itemController.createItem);
router.put('/:id', upload.single('image'), itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

// Link/Unlink variants to items
router.post('/:id/variants', itemController.linkVariantsToItem);
router.delete('/:id/variants/:variantId', itemController.unlinkVariantFromItem);

module.exports = router;

/*
Item routes for product and inventory management.
This file sets up Express routes for item operations with image upload support.
Features:
- Item creation with image upload
- Complete CRUD operations for item management
- Stock quantity tracking
- Cloudinary integration for image storage
- Active/inactive status management
*/ 