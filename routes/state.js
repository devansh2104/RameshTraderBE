const express = require('express');
const router = express.Router();
const statesController = require('../controllers/stateController');

// GET all states
router.get('/', statesController.getAllStates);

// GET single state by ID
router.get('/:id', statesController.getStateById);

// POST create new state
router.post('/', statesController.createState);

// PUT update state
router.put('/:id', statesController.updateState);

// DELETE state (soft delete)
router.delete('/:id', statesController.deleteState);

module.exports = router;