// Category CRUD operations controller
const db = require('../db');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { extractPublicId } = require('../cloudinaryUtils');
const { checkSlugUnique } = require('../slugUtils');

// Get all categories
exports.getAllCategories = (req, res) => {
  db.query('SELECT * FROM categories', (err, results) => {
    if (err) {
      console.log('Error in getAllCategories:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Get a category by ID
exports.getCategoryById = (req, res) => {
  db.query('SELECT * FROM categories WHERE category_id = ?', [req.params.id], (err, results) => {
    if (err) {
      console.log('Error in getCategoryById:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.log('Category not found in getCategoryById:', req.params.id);
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(results[0]);
  });
};

// Get a category by slug
exports.getCategoryBySlug = (req, res) => {
  db.query('SELECT * FROM categories WHERE slug = ?', [req.params.slug], (err, results) => {
    if (err) {
      console.log('Error in getCategoryBySlug:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.log('Category not found in getCategoryBySlug:', req.params.slug);
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(results[0]);
  });
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, is_active, alt_tag } = req.body;  // ✅ added alt_tag
    const image_url = req.file ? req.file.path : null;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    if (!image_url) {
      return res.status(400).json({ error: 'Image is required' });
    }
    
    const isUnique = await checkSlugUnique(db, 'categories', slug);
    if (!isUnique) {
      return res.status(400).json({ error: 'Slug already exists. Please choose a different slug.' });
    }

    db.query(
      'INSERT INTO categories (name, slug, description, image_url, alt_tag, is_active) VALUES (?, ?, ?, ?, ?, ?)',  // ✅ added alt_tag
      [name, slug, description, image_url, alt_tag || null, is_active ?? 1],  // ✅ added alt_tag param
      (err, result) => {
        if (err) {
          console.log('Error in createCategory:', err.message, { name, hasImage: !!image_url });
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
          category_id: result.insertId, 
          name, 
          slug,
          description, 
          image_url, 
          alt_tag: alt_tag || null,  // ✅ return alt_tag
          is_active: is_active ?? 1 
        });
      }
    );
  } catch (error) {
    console.log('Error in createCategory:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
// Update a category by ID
exports.updateCategory = async (req, res) => {
  try {
    const { name, slug, description, is_active } = req.body;
    // Use Cloudinary URL if image uploaded
    const image_url = req.file ? req.file.path : req.body.image_url;
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    // Check if slug is unique (excluding current record)
    const isUnique = await checkSlugUnique(db, 'categories', slug, req.params.id);
    if (!isUnique) {
      return res.status(400).json({ error: 'Slug already exists. Please choose a different slug.' });
    }
    
    db.query(
      'UPDATE categories SET name=?, slug=?, description=?, image_url=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE category_id=?',
      [name, slug, description, image_url, is_active, req.params.id],
      (err, result) => {
        if (err) {
          console.log('Error in updateCategory:', err.message, { id: req.params.id });
          return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
          console.log('Category not found in updateCategory:', req.params.id);
          return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ category_id: req.params.id, name, slug, description, image_url, is_active });
      }
    );
  } catch (error) {
    console.log('Error in updateCategory:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Delete a category by ID
exports.deleteCategory = (req, res) => {
  // First, get the image_url for the category
  db.query('SELECT image_url FROM categories WHERE category_id = ?', [req.params.id], (err, results) => {
    if (err) {
      console.log('Error fetching category for image deletion:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.log('Category not found in deleteCategory:', req.params.id);
      return res.status(404).json({ error: 'Category not found' });
    }
    const image_url = results[0].image_url;
    const publicId = extractPublicId(image_url);
    if (publicId) {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.log('Error deleting image from Cloudinary:', error);
        } else {
          console.log('Cloudinary delete result:', result);
        }
        // Proceed to delete the DB record regardless of Cloudinary result
        db.query('DELETE FROM categories WHERE category_id = ?', [req.params.id], (err, result) => {
          if (err) {
            console.log('Error in deleteCategory:', err.message);
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Category deleted' });
        });
      });
    } else {
      // No image to delete, just delete the DB record
      db.query('DELETE FROM categories WHERE category_id = ?', [req.params.id], (err, result) => {
        if (err) {
          console.log('Error in deleteCategory:', err.message);
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Category deleted' });
      });
    }
  });
};

// Add a service to a category
exports.addServiceToCategory = (req, res) => {
  const { category_id, service_id } = req.body;
  if (!category_id || !service_id) {
    return res.status(400).json({ error: 'category_id and service_id are required' });
  }
  db.query('SELECT * FROM category_services WHERE category_id = ? AND service_id = ?', [category_id, service_id], (err, results) => {
    if (err) {
      console.log('Error checking category-service relationship:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length > 0) {
      return res.status(400).json({ error: 'Service is already connected to this category' });
    }
    db.query('INSERT INTO category_services (category_id, service_id) VALUES (?, ?)', [category_id, service_id], (err, result) => {
      if (err) {
        console.log('Error adding service to category:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Service added to category successfully', id: result.insertId });
    });
  });
};

// Remove a service from a category
exports.removeServiceFromCategory = (req, res) => {
  const { category_id, service_id } = req.params;
  db.query('DELETE FROM category_services WHERE category_id = ? AND service_id = ?', [category_id, service_id], (err, result) => {
    if (err) {
      console.log('Error removing service from category:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category-service relationship not found' });
    }
    res.json({ message: 'Service removed from category successfully' });
  });
};

// Get all services for a specific category
exports.getCategoryServices = (req, res) => {
  const categoryId = req.params.id;
  const query = `
    SELECT s.*
    FROM services s
    INNER JOIN category_services cs ON s.service_id = cs.service_id
    WHERE cs.category_id = ? AND s.is_active = 1
    ORDER BY s.name
  `;
  db.query(query, [categoryId], (err, results) => {
    if (err) {
      console.log('Error getting category services:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Get all categories with empty services array (since services table does not exist)
exports.getCategoriesWithServices = (req, res) => {
  const query = 'SELECT * FROM categories WHERE is_active = 1';
  db.query(query, (err, results) => {
    if (err) {
      console.log('Error in getCategoriesWithServices:', err.message);
      return res.status(500).json({ error: err.message });
    }
    const categories = results.map(row => ({
      ...row,
      services: []
    }));
    res.json(categories);
  });
};

// Add an item to a category
exports.addItemToCategory = (req, res) => {
  const { category_id, item_id } = req.body;
  if (!category_id || !item_id) {
    return res.status(400).json({ error: 'category_id and item_id are required' });
  }
  db.query('SELECT * FROM category_items WHERE category_id = ? AND item_id = ?', [category_id, item_id], (err, results) => {
    if (err) {
      console.log('Error checking category-item relationship:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length > 0) {
      return res.status(400).json({ error: 'Item is already connected to this category' });
    }
    db.query('INSERT INTO category_items (category_id, item_id) VALUES (?, ?)', [category_id, item_id], (err, result) => {
      if (err) {
        console.log('Error adding item to category:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Item added to category successfully', id: result.insertId });
    });
  });
};

// Remove an item from a category
exports.removeItemFromCategory = (req, res) => {
  const { category_id, item_id } = req.params;
  db.query('DELETE FROM category_items WHERE category_id = ? AND item_id = ?', [category_id, item_id], (err, result) => {
    if (err) {
      console.log('Error removing item from category:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category-item relationship not found' });
    }
    res.json({ message: 'Item removed from category successfully' });
  });
};

// Get all items for a specific category
exports.getCategoryItems = (req, res) => {
  const categoryId = req.params.id;
  const query = `
    SELECT i.*
    FROM items i
    INNER JOIN category_items ci ON i.item_id = ci.item_id
    WHERE ci.category_id = ? AND i.is_active = 1
    ORDER BY i.name
  `;
  db.query(query, [categoryId], (err, results) => {
    if (err) {
      console.log('Error getting category items:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Get all categories with their connected items
exports.getCategoriesWithItems = (req, res) => {
  const query = `
    SELECT 
      c.category_id,
      c.name as category_name,
      c.description as category_description,
      c.image_url as category_image_url,
      c.is_active as category_is_active,
      c.created_at as category_created_at,
      c.updated_at as category_updated_at,
      i.item_id,
      i.name as item_name,
      i.description as item_description,
      i.price as item_price,
      i.image_url as item_image_url,
      i.stock_qty,
      i.is_active as item_is_active,
      i.created_at as item_created_at,
      i.updated_at as item_updated_at
    FROM categories c
    LEFT JOIN category_items ci ON c.category_id = ci.category_id
    LEFT JOIN items i ON ci.item_id = i.item_id
    WHERE c.is_active = 1
    ORDER BY c.category_id, i.item_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.log('Error in getCategoriesWithItems:', err.message);
      return res.status(500).json({ error: err.message });
    }
    const categoriesMap = new Map();
    results.forEach(row => {
      const categoryId = row.category_id;
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          category_id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          image_url: row.category_image_url,
          is_active: row.category_is_active,
          created_at: row.category_created_at,
          updated_at: row.category_updated_at,
          items: []
        });
      }
      if (row.item_id) {
        const category = categoriesMap.get(categoryId);
        category.items.push({
          item_id: row.item_id,
          name: row.item_name,
          description: row.item_description,
          price: row.item_price,
          image_url: row.item_image_url,
          stock_qty: row.stock_qty,
          is_active: row.item_is_active,
          created_at: row.item_created_at,
          updated_at: row.item_updated_at
        });
      }
    });
    res.json(Array.from(categoriesMap.values()));
  });
};

// Get categories count
exports.getCategoriesCount = (req, res) => {
  db.query('SELECT COUNT(*) as total_categories FROM categories', (err, results) => {
    if (err) {
      console.log('Error in getCategoriesCount:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      total_categories: results[0].total_categories
    });
  });
};

// Get active categories count
exports.getActiveCategoriesCount = (req, res) => {
  db.query('SELECT COUNT(*) as active_categories FROM categories WHERE is_active = 1', (err, results) => {
    if (err) {
      console.log('Error in getActiveCategoriesCount:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      active_categories: results[0].active_categories
    });
  });
};

/*
Category controller for managing product and service categories.
This controller handles category creation, updates, and management.
Features:
- Cloudinary image upload for category images
- Complete CRUD operations for category management
- Active/inactive status management
- Error handling and validation
*/ 