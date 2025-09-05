// Banner CRUD operations controller
const db = require('../db');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { extractPublicId } = require('../cloudinaryUtils');

// Get all banners
exports.getAllBanners = (req, res) => {
  db.query(
    'SELECT id, title, image_url, alt_tag, description, is_active, created_at FROM banner',
    (err, results) => {
      if (err) {
        console.log('Error in getAllBanners:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
};

// Get a banner by ID
exports.getBannerById = (req, res) => {
  db.query(
    'SELECT id, title, image_url, alt_tag, description, is_active, created_at FROM banner WHERE id = ?',
    [req.params.id],
    (err, results) => {
      if (err) {
        console.log('Error in getBannerById:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        console.log('Banner not found in getBannerById:', req.params.id);
        return res.status(404).json({ error: 'Banner not found' });
      }
      res.json(results[0]);
    }
  );
};

// Create a new banner
exports.createBanner = (req, res) => {
  const { title, description, alt_tag, is_active } = req.body;
  const image_url = req.file ? req.file.path : null;

  if (!image_url) {
    return res.status(400).json({ error: 'Image is required' });
  }

  db.query(
    'INSERT INTO banner (title, image_url, alt_tag, description, is_active) VALUES (?, ?, ?, ?, ?)',
    [title, image_url, alt_tag || null, description, is_active ?? 1],
    (err, result) => {
      if (err) {
        console.log('Error in createBanner:', err.message, { title, hasImage: !!image_url });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: result.insertId,
        title,
        image_url,
        alt_tag: alt_tag || null,
        description,
        is_active: is_active ?? 1,
      });
    }
  );
};

// Update a banner by ID
exports.updateBanner = (req, res) => {
  const { title, description, alt_tag, is_active } = req.body;
  const image_url = req.file ? req.file.path : req.body.image_url;

  db.query(
    'UPDATE banner SET title=?, image_url=?, alt_tag=?, description=?, is_active=? WHERE id=?',
    [title, image_url, alt_tag || null, description, is_active, req.params.id],
    (err, result) => {
      if (err) {
        console.log('Error in updateBanner:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        console.log('Banner not found in updateBanner:', req.params.id);
        return res.status(404).json({ error: 'Banner not found' });
      }
      res.json({
        id: req.params.id,
        title,
        image_url,
        alt_tag: alt_tag || null,
        description,
        is_active,
      });
    }
  );
};

// Delete a banner by ID
exports.deleteBanner = (req, res) => {
  db.query('SELECT image_url FROM banner WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      console.log('Error fetching banner for image deletion:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.log('Banner not found in deleteBanner:', req.params.id);
      return res.status(404).json({ error: 'Banner not found' });
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
        db.query('DELETE FROM banner WHERE id = ?', [req.params.id], (err) => {
          if (err) {
            console.log('Error in deleteBanner:', err.message);
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Banner deleted' });
        });
      });
    } else {
      db.query('DELETE FROM banner WHERE id = ?', [req.params.id], (err) => {
        if (err) {
          console.log('Error in deleteBanner:', err.message);
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Banner deleted' });
      });
    }
  });
};


// Get banners count
exports.getBannersCount = (req, res) => {
  db.query('SELECT COUNT(*) as total_banners FROM banner', (err, results) => {
    if (err) {
      console.log('Error in getBannersCount:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      total_banners: results[0].total_banners
    });
  });
};

// Get active banners count
exports.getActiveBannersCount = (req, res) => {
  db.query('SELECT COUNT(*) as active_banners FROM banner WHERE is_active = 1', (err, results) => {
    if (err) {
      console.log('Error in getActiveBannersCount:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      active_banners: results[0].active_banners
    });
  });
};

/*
Banner controller for managing promotional banners and announcements.
This controller handles banner creation, updates, and management.
Features:
- Cloudinary image upload for banner images
- Complete CRUD operations for banner management
- Active/inactive status management
- Error handling and validation
*/ 