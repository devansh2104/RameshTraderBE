// Gallery CRUD operations controller
const db = require("../db");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { extractPublicId } = require("../cloudinaryUtils");

// Get all gallery images
exports.getAllImages = (req, res) => {
  db.query(
    "SELECT id, title, image_url, alt_tag, description, IFNULL(media_type, 'photo') AS media_type, created_at, updated_at FROM gallery ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.log("Error in getAllImages:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
};

// Get an image by ID
exports.getImageById = (req, res) => {
  db.query(
    "SELECT id, title, image_url, alt_tag, description, IFNULL(media_type, 'photo') AS media_type, created_at, updated_at FROM gallery WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) {
        console.log("Error in getImageById:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        console.log("Image not found in getImageById:", req.params.id);
        return res.status(404).json({ error: "Image not found" });
      }
      res.json(results[0]);
    }
  );
};

// Create a new gallery item (photo/video)
exports.createImage = (req, res) => {
  const { title, description, alt_tag } = req.body;
  const media_type = (req.body && String(req.body.type || 'photo').toLowerCase()) === 'video' ? 'video' : 'photo';
  const image_url = req.file ? req.file.path : null;


  //testing
  if (!image_url) {
    return res.status(400).json({ error: media_type === 'video' ? "Video file is required" : "Image is required" });
  }

  db.query(
    "INSERT INTO gallery (title, image_url, alt_tag, description, media_type) VALUES (?, ?, ?, ?, ?)",
    [title, image_url, alt_tag || null, description || null, media_type],
    (err, result) => {
      if (err) {
        console.log("Error in createImage:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: result.insertId,
        title,
        image_url,
        media_type,
        alt_tag: alt_tag || null,
        description: description || null,
        created_at: new Date().toISOString(),
      });
    }
  );
};
//For testing purpose

// Update a gallery image by ID
exports.updateImage = (req, res) => {
  const { title, description, alt_tag } = req.body;
  const image_url = req.file ? req.file.path : req.body.image_url;
  const media_type = (req.body && String(req.body.type || '').toLowerCase()) === 'video' ? 'video' : undefined; // optional on update

  const sql = media_type
    ? "UPDATE gallery SET title=?, image_url=?, alt_tag=?, description=?, media_type=?, updated_at=NOW() WHERE id=?"
    : "UPDATE gallery SET title=?, image_url=?, alt_tag=?, description=?, updated_at=NOW() WHERE id=?";
  const params = media_type
    ? [title, image_url, alt_tag || null, description || null, media_type, req.params.id]
    : [title, image_url, alt_tag || null, description || null, req.params.id];

  db.query(
    sql,
    params,
    (err, result) => {
      if (err) {
        console.log("Error in updateImage:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        console.log("Image not found in updateImage:", req.params.id);
        return res.status(404).json({ error: "Image not found" });
      }
      res.json({
        id: req.params.id,
        title,
        image_url,
        media_type: media_type, 
        alt_tag: alt_tag || null,
        description: description || null, 
        updated_at: new Date().toISOString(),
      });
    }
  );
};

// Delete a gallery image by ID
exports.deleteImage = (req, res) => {
  db.query(
    "SELECT image_url, IFNULL(media_type, 'photo') AS media_type FROM gallery WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) {
        console.log("Error fetching image for deletion:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        console.log("Image not found in deleteImage:", req.params.id);
        return res.status(404).json({ error: "Image not found" });
      }
      const image_url = results[0].image_url;
      const media_type = results[0].media_type === 'video' ? 'video' : 'image';
      const publicId = extractPublicId(image_url);
      if (publicId) {
        // Choose correct resource type for deletion
        cloudinary.uploader.destroy(publicId, { resource_type: media_type }, (error, result) => {
          if (error) {
            console.log("Error deleting image from Cloudinary:", error);
          } else {
            console.log("Cloudinary delete result:", result);
          }
          db.query(
            "DELETE FROM gallery WHERE id = ?",
            [req.params.id],
            (err, result) => {
              if (err) {
                console.log("Error in deleteImage:", err.message);
                return res.status(500).json({ error: err.message });
              }
              res.json({ message: "Image deleted" });
            }
          );
        });
      } else {
        db.query(
          "DELETE FROM gallery WHERE id = ?",
          [req.params.id],
          (err, result) => {
            if (err) {
              console.log("Error in deleteImage:", err.message);
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Image deleted" });
          }
        );
      }
    }
  );
};

// Get gallery images count
exports.getImagesCount = (req, res) => {
  db.query("SELECT COUNT(*) as total_images FROM gallery", (err, results) => {
    if (err) {
      console.log("Error in getImagesCount:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      total_images: results[0].total_images,
    });
  });
};

/*
Gallery controller for managing gallery images.
This controller handles image creation, updates, and management.
Features:
- Cloudinary image upload for gallery images
- Complete CRUD operations for gallery management
- Image metadata management
- Error handling and validation
*/
