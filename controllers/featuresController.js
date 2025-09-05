// Features CRUD operations controller
const db = require('../db');

// Get all features
exports.getAllFeatures = (req, res) => {
  db.query('SELECT * FROM features', (err, results) => {
    if (err) {
      console.log('Error in getAllFeatures:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Get a feature by ID
exports.getFeatureById = (req, res) => {
  db.query('SELECT * FROM features WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      console.log('Error in getFeatureById:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.log('Feature not found in getFeatureById:', req.params.id);
      return res.status(404).json({ error: 'Feature not found' });
    }
    res.json(results[0]);
  });
};

// Create a new feature
exports.createFeature = (req, res) => {
  const { features } = req.body;
  
  if (!features) {
    return res.status(400).json({ error: 'Features data is required' });
  }

  db.query(
    'INSERT INTO features (features) VALUES (?)',
    [features],
    (err, result) => {
      if (err) {
        console.log('Error in createFeature:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        id: result.insertId, 
        features: features 
      });
    }
  );
};

// Update a feature by ID
exports.updateFeature = (req, res) => {
  const { features } = req.body;
  
  if (!features) {
    return res.status(400).json({ error: 'Features data is required' });
  }

  db.query(
    'UPDATE features SET features = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [features, req.params.id],
    (err, result) => {
      if (err) {
        console.log('Error in updateFeature:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        console.log('Feature not found in updateFeature:', req.params.id);
        return res.status(404).json({ error: 'Feature not found' });
      }
      res.json({ 
        id: req.params.id, 
        features: features 
      });
    }
  );
};

// Delete a feature by ID
exports.deleteFeature = (req, res) => {
  db.query('DELETE FROM features WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.log('Error in deleteFeature:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      console.log('Feature not found in deleteFeature:', req.params.id);
      return res.status(404).json({ error: 'Feature not found' });
    }
    res.json({ message: 'Feature deleted successfully' });
  });
};

// Get features count
exports.getFeaturesCount = (req, res) => {
  db.query('SELECT COUNT(*) as total_features FROM features', (err, results) => {
    if (err) {
      console.log('Error in getFeaturesCount:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      total_features: results[0].total_features
    });
  });
};

// Link features to an item
exports.linkFeaturesToItem = (req, res) => {
  const { item_id, feature_ids } = req.body;
  
  if (!item_id || !feature_ids || !Array.isArray(feature_ids)) {
    return res.status(400).json({ error: 'item_id and feature_ids array are required' });
  }

  // First check if item exists
  db.query('SELECT * FROM items WHERE item_id = ?', [item_id], (err, results) => {
    if (err) {
      console.log('Error checking item existence:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if all features exist
    const featureIdsString = feature_ids.join(',');
    db.query('SELECT id FROM features WHERE id IN (?)', [featureIdsString], (err, results) => {
      if (err) {
        console.log('Error checking features existence:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (results.length !== feature_ids.length) {
        return res.status(400).json({ error: 'One or more features not found' });
      }

      // Update item with new features
      db.query(
        'UPDATE items SET features = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?',
        [featureIdsString, item_id],
        (err, result) => {
          if (err) {
            console.log('Error linking features to item:', err.message);
            return res.status(500).json({ error: err.message });
          }
          res.json({ 
            message: 'Features linked to item successfully',
            item_id: item_id,
            feature_ids: feature_ids
          });
        }
      );
    });
  });
};

// Unlink features from an item
exports.unlinkFeaturesFromItem = (req, res) => {
  const { item_id, feature_ids } = req.body;
  
  if (!item_id || !feature_ids || !Array.isArray(feature_ids)) {
    return res.status(400).json({ error: 'item_id and feature_ids array are required' });
  }

  // Get current features for the item
  db.query('SELECT features FROM items WHERE item_id = ?', [item_id], (err, results) => {
    if (err) {
      console.log('Error getting item features:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentFeatures = results[0].features;
    if (!currentFeatures) {
      return res.status(400).json({ error: 'Item has no features to unlink' });
    }

    // Remove specified features from the comma-separated list
    const currentFeatureArray = currentFeatures.split(',').map(id => parseInt(id.trim()));
    const updatedFeatures = currentFeatureArray.filter(id => !feature_ids.includes(id));
    const updatedFeaturesString = updatedFeatures.length > 0 ? updatedFeatures.join(',') : null;

    // Update item with remaining features
    db.query(
      'UPDATE items SET features = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?',
      [updatedFeaturesString, item_id],
      (err, result) => {
        if (err) {
          console.log('Error unlinking features from item:', err.message);
          return res.status(500).json({ error: err.message });
        }
        res.json({ 
          message: 'Features unlinked from item successfully',
          item_id: item_id,
          removed_feature_ids: feature_ids,
          remaining_features: updatedFeatures
        });
      }
    );
  });
};

// Get items that have a specific feature
exports.getItemsByFeature = (req, res) => {
  const featureId = req.params.featureId;
  
  const query = `
    SELECT i.*, GROUP_CONCAT(f.features) as item_features
    FROM items i
    LEFT JOIN features f ON FIND_IN_SET(f.id, i.features) > 0
    WHERE FIND_IN_SET(?, i.features) > 0
    GROUP BY i.item_id
  `;
  
  db.query(query, [featureId], (err, results) => {
    if (err) {
      console.log('Error in getItemsByFeature:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    const itemsWithFeatures = results.map(item => {
      let features = null;
      if (item.item_features) {
        try {
          const featureStrings = item.item_features.split(',');
          features = featureStrings;
        } catch (error) {
          console.log('Error parsing features:', error);
          features = null;
        }
      }
      return {
        ...item,
        features: features
      };
    });
    
    res.json(itemsWithFeatures);
  });
};

/*
Features controller for managing product features.
This controller handles feature creation, updates, and management.
Features:
- Simple text-based feature storage (one feature per row)
- Complete CRUD operations for feature management
- Link/unlink features to items using comma-separated IDs
- Error handling and validation
*/ 