const express = require('express');
const variantController = require('../controllers/variantController');

const router = express.Router();

// POST /api/variants → create variant
router.post('/', variantController.createVariant);

// GET /api/variants → get all variants
router.get('/', variantController.getAllVariants);

// GET /api/variants/:id → get variant by ID
router.get('/:id', variantController.getVariantById);

// PUT /api/variants/:id → update variant
router.put('/:id', variantController.updateVariant);

// DELETE /api/variants/:id → delete variant
router.delete('/:id', variantController.deleteVariant);

module.exports = router; 