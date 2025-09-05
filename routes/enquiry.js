const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');

// Create a new enquiry (POST)
router.post('/', enquiryController.createEnquiry);

// Get all enquiries (GET)
router.get('/', enquiryController.getAllEnquiries);

// Get enquiry by ID (GET)
router.get('/:id', enquiryController.getEnquiryById);

// Update enquiry by ID (PUT)
router.put('/:id', enquiryController.updateEnquiry);

// Delete enquiry by ID (DELETE)
router.delete('/:id', enquiryController.deleteEnquiry);

// Get enquiries by email (GET)
router.get('/email/:email', enquiryController.getEnquiriesByEmail);

// Get enquiries count (GET)
router.get('/count/total', enquiryController.getEnquiriesCount);

module.exports = router; 