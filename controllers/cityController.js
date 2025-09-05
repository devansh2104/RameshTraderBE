const db = require('../db');

const citiesController = {
    // GET all cities
    getAllCities: (req, res) => {
        const query = `
            SELECT c.*, s.name as state_name 
            FROM cities c 
            JOIN states s ON c.state_id = s.id 
            WHERE c.is_active = 1 AND s.is_active = 1 
            ORDER BY s.name, c.name
        `;
        
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching cities:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            res.json({
                success: true,
                data: results,
                count: results.length
            });
        });
    },

    // GET cities by state_id
    getCitiesByState: (req, res) => {
        const stateId = req.params.state_id;
        
        if (!stateId || isNaN(stateId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid state ID is required'
            });
        }

        const query = `
            SELECT c.*, s.name as state_name 
            FROM cities c 
            JOIN states s ON c.state_id = s.id 
            WHERE c.state_id = ? AND c.is_active = 1 AND s.is_active = 1 
            ORDER BY c.name
        `;
        
        db.query(query, [stateId], (err, results) => {
            if (err) {
                console.error('Error fetching cities by state:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            res.json({
                success: true,
                data: results,
                count: results.length,
                state_id: parseInt(stateId)
            });
        });
    },

    // GET single city by ID
    getCityById: (req, res) => {
        const cityId = req.params.id;
        
        if (!cityId || isNaN(cityId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid city ID is required'
            });
        }

        const query = `
            SELECT c.*, s.name as state_name 
            FROM cities c 
            JOIN states s ON c.state_id = s.id 
            WHERE c.id = ? AND c.is_active = 1 AND s.is_active = 1
        `;
        
        db.query(query, [cityId], (err, results) => {
            if (err) {
                console.error('Error fetching city:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'City not found'
                });
            }
            
            res.json({
                success: true,
                data: results[0]
            });
        });
    },

    // POST create new city
    createCity: (req, res) => {
        const { state_id, name, is_active = 1 } = req.body;
        
        if (!state_id || !name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'State ID and city name are required'
            });
        }
        
        if (isNaN(state_id)) {
            return res.status(400).json({
                success: false,
                error: 'Valid state ID is required'
            });
        }

        // First check if state exists and is active
        const checkStateQuery = 'SELECT id FROM states WHERE id = ? AND is_active = 1';
        
        db.query(checkStateQuery, [state_id], (err, stateResults) => {
            if (err) {
                console.error('Error checking state:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            if (stateResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid state ID or state is inactive'
                });
            }

            const insertQuery = 'INSERT INTO cities (state_id, name, is_active) VALUES (?, ?, ?)';
            
            db.query(insertQuery, [state_id, name.trim(), is_active], (err, result) => {
                if (err) {
                    console.error('Error creating city:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            success: false,
                            error: 'City name already exists in this state'
                        });
                    }
                    return res.status(500).json({
                        success: false,
                        error: 'Internal server error'
                    });
                }
                
                res.status(201).json({
                    success: true,
                    message: 'City created successfully',
                    data: {
                        id: result.insertId,
                        state_id: parseInt(state_id),
                        name: name.trim(),
                        is_active: is_active
                    }
                });
            });
        });
    },

    // PUT update city
    updateCity: (req, res) => {
        const cityId = req.params.id;
        const { state_id, name, is_active } = req.body;
        
        if (!cityId || isNaN(cityId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid city ID is required'
            });
        }
        
        if (!state_id || !name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'State ID and city name are required'
            });
        }
        
        if (isNaN(state_id)) {
            return res.status(400).json({
                success: false,
                error: 'Valid state ID is required'
            });
        }

        // Check if state exists and is active
        const checkStateQuery = 'SELECT id FROM states WHERE id = ? AND is_active = 1';
        
        db.query(checkStateQuery, [state_id], (err, stateResults) => {
            if (err) {
                console.error('Error checking state:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            if (stateResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid state ID or state is inactive'
                });
            }

            const updateQuery = 'UPDATE cities SET state_id = ?, name = ?, is_active = ? WHERE id = ?';
            
            db.query(updateQuery, [state_id, name.trim(), is_active, cityId], (err, result) => {
                if (err) {
                    console.error('Error updating city:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            success: false,
                            error: 'City name already exists in this state'
                        });
                    }
                    return res.status(500).json({
                        success: false,
                        error: 'Internal server error'
                    });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'City not found'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'City updated successfully',
                    data: {
                        id: parseInt(cityId),
                        state_id: parseInt(state_id),
                        name: name.trim(),
                        is_active: is_active
                    }
                });
            });
        });
    },

    // DELETE city (soft delete)
    deleteCity: (req, res) => {
        const cityId = req.params.id;
        
        if (!cityId || isNaN(cityId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid city ID is required'
            });
        }

        const query = 'UPDATE cities SET is_active = 0 WHERE id = ?';
        
        db.query(query, [cityId], (err, result) => {
            if (err) {
                console.error('Error deleting city:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'City not found'
                });
            }
            
            res.json({
                success: true,
                message: 'City deleted successfully'
            });
        });
    },

    // GET cities count by state_id
    getCitiesCountByState: (req, res) => {
        const stateId = req.params.state_id;
        
        if (!stateId || isNaN(stateId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid state ID is required'
            });
        }

        const query = `
            SELECT COUNT(*) as count 
            FROM cities c 
            JOIN states s ON c.state_id = s.id 
            WHERE c.state_id = ? AND c.is_active = 1 AND s.is_active = 1
        `;
        
        db.query(query, [stateId], (err, results) => {
            if (err) {
                console.error('Error fetching city count by state:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            res.json({
                success: true,
                count: results[0].count,
                state_id: parseInt(stateId)
            });
        });
    }
};

// Export the controller
module.exports = citiesController;