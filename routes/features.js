const express = require('express');
const router = express.Router();
const featuresController = require('../controllers/featuresController');

// Get all features
router.get('/', featuresController.getAllFeatures);

// Get a feature by ID
router.get('/:id', featuresController.getFeatureById);

// Create a new feature
router.post('/', featuresController.createFeature);

// Update a feature by ID
router.put('/:id', featuresController.updateFeature);

// Delete a feature by ID
router.delete('/:id', featuresController.deleteFeature);

// Get features count
router.get('/count/total', featuresController.getFeaturesCount);

// Link features to an item
router.post('/link-to-item', featuresController.linkFeaturesToItem);

// Unlink features from an item
router.post('/unlink-from-item', featuresController.unlinkFeaturesFromItem);

// Get items that have a specific feature
router.get('/:featureId/items', featuresController.getItemsByFeature);

module.exports = router; 