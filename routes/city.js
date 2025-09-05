const express = require('express');
const router = express.Router();
const citiesController = require('../controllers/cityController');

// GET all cities
router.get('/', citiesController.getAllCities);

// GET cities by state_id (Important: This route must come before /:id route)
router.get('/state/:state_id', citiesController.getCitiesByState);

// GET count of cities by state_id
router.get('/state/:state_id/count', citiesController.getCitiesCountByState);

// GET single city by ID
router.get('/:id', citiesController.getCityById);

// POST create new city
router.post('/', citiesController.createCity);

// PUT update city
router.put('/:id', citiesController.updateCity);

// DELETE city (soft delete)
router.delete('/:id', citiesController.deleteCity);

module.exports = router;