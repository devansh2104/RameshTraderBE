const db = require('../db');

const statesController = {
  // GET all states
  getAllStates: (req, res) => {
    const query = 'SELECT * FROM states WHERE is_active = 1 ORDER BY name';
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching states:', err);
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

  // GET single state by ID
  getStateById: (req, res) => {
    const stateId = req.params.id;
    const query = 'SELECT * FROM states WHERE id = ? AND is_active = 1';
    
    db.query(query, [stateId], (err, results) => {
      if (err) {
        console.error('Error fetching state:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Internal server error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'State not found' 
        });
      }
      
      res.json({
        success: true,
        data: results[0]
      });
    });
  },

  // POST create new state
  createState: (req, res) => {
    const { name, is_active = 1 } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'State name is required' 
      });
    }
    
    const query = 'INSERT INTO states (name, is_active) VALUES (?, ?)';
    
    db.query(query, [name.trim(), is_active], (err, result) => {
      if (err) {
        console.error('Error creating state:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ 
            success: false,
            error: 'State name already exists' 
          });
        }
        return res.status(500).json({ 
          success: false,
          error: 'Internal server error' 
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'State created successfully',
        data: {
          id: result.insertId,
          name: name.trim(),
          is_active: is_active
        }
      });
    });
  },

  // PUT update state
  updateState: (req, res) => {
    const stateId = req.params.id;
    const { name, is_active } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'State name is required' 
      });
    }
    
    const query = 'UPDATE states SET name = ?, is_active = ? WHERE id = ?';
    
    db.query(query, [name.trim(), is_active, stateId], (err, result) => {
      if (err) {
        console.error('Error updating state:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ 
            success: false,
            error: 'State name already exists' 
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
          error: 'State not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'State updated successfully',
        data: {
          id: stateId,
          name: name.trim(),
          is_active: is_active
        }
      });
    });
  },

  // DELETE state (soft delete)
  deleteState: (req, res) => {
    const stateId = req.params.id;
    
    // First check if state has active cities
    const checkCitiesQuery = 'SELECT COUNT(*) as city_count FROM cities WHERE state_id = ? AND is_active = 1';
    
    db.query(checkCitiesQuery, [stateId], (err, cityResults) => {
      if (err) {
        console.error('Error checking cities:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Internal server error' 
        });
      }
      
      if (cityResults[0].city_count > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'Cannot delete state with active cities. Please deactivate cities first.' 
        });
      }
      
      const deleteQuery = 'UPDATE states SET is_active = 0 WHERE id = ?';
      
      db.query(deleteQuery, [stateId], (err, result) => {
        if (err) {
          console.error('Error deleting state:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
          });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ 
            success: false,
            error: 'State not found' 
          });
        }
        
        res.json({
          success: true,
          message: 'State deleted successfully'
        });
      });
    });
  }
};

module.exports = statesController;