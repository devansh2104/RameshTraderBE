const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

// List all meta
router.get('/', metaController.listAllMeta);

// CRUD for meta using slug-only addressing
router.get('/default/:type', metaController.getDefaultByType);
router.get('/:slug', metaController.getMetaBySlug);
router.post('/:slug', metaController.createMetaBySlug);
router.put('/:slug', metaController.updateMetaBySlug);
router.delete('/:slug', metaController.deleteMetaBySlug);

module.exports = router;


