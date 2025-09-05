// Item CRUD operations controller
const db = require("../db");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { extractPublicId } = require("../cloudinaryUtils");
const { checkSlugUnique } = require("../slugUtils");

function parseVariantDescription(desc) {
  if (desc == null) return null;
  if (typeof desc !== "string") return desc;
  try {
    return JSON.parse(desc);
  } catch (_) {
    return null;
  }
}

// Get all items with features
exports.getAllItems = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        i.*,
        GROUP_CONCAT(DISTINCT f.features) AS item_features,
        GROUP_CONCAT(DISTINCT c.name) AS category_names
      FROM items i
      LEFT JOIN features f ON FIND_IN_SET(f.id, i.features) > 0
      LEFT JOIN category_items ci ON i.item_id = ci.item_id
      LEFT JOIN categories c ON ci.category_id = c.category_id
      GROUP BY i.item_id
    `);

    // First pass: map items, parse variant ids, collect all unique variant ids
    const items = rows.map((row) => {
      let features = null;
      if (row.item_features) {
        try {
          features = row.item_features.split(",");
        } catch (_) {
          features = null;
        }
      }

      // Normalize and preserve variant_ids
      let parsedVariantIds = [];
      let variantIdsRaw = "[]";
      if (row.variant_ids !== undefined && row.variant_ids !== null) {
        if (typeof row.variant_ids === "string") {
          variantIdsRaw = row.variant_ids;
          try {
            parsedVariantIds = JSON.parse(row.variant_ids);
          } catch (_) {
            parsedVariantIds = [];
          }
        } else {
          try {
            parsedVariantIds = Array.isArray(row.variant_ids)
              ? row.variant_ids
              : JSON.parse(row.variant_ids);
          } catch (_) {
            parsedVariantIds = [];
          }
          variantIdsRaw = JSON.stringify(parsedVariantIds);
        }
      }

      const { item_features, category_names, ...rest } = row;
      return {
        ...rest,
        features,
        variant_ids: variantIdsRaw,
        _variant_id_list: parsedVariantIds
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n)),
      };
    });

    const allVariantIds = new Set();
    for (const item of items) {
      item._variant_id_list.forEach((id) => allVariantIds.add(id));
    }

    // Fetch all variants once using actual PK `id`, include description for details
    let idToVariantRow = new Map();
    if (allVariantIds.size > 0) {
      const idsArray = Array.from(allVariantIds);
      const placeholders = idsArray.map(() => "?").join(",");
      const [variantRows] = await db
        .promise()
        .query(
          `SELECT id, name, description FROM variants WHERE id IN (${placeholders})`,
          idsArray
        );
      idToVariantRow = new Map(variantRows.map((v) => [Number(v.id), v]));
    }

    // Attach variants as an object keyed by name with parsed description fields
    const finalItems = items.map((item) => {
      const variantsObject = {};
      for (const id of item._variant_id_list || []) {
        const v = idToVariantRow.get(id);
        if (!v || !v.name) continue;
        const details = parseVariantDescription(v.description) || {};
        variantsObject[v.name] = { id: v.id, ...details };
      }
      const { _variant_id_list, ...rest } = item;
      return { ...rest, variants: variantsObject };
    });

    return res.json(finalItems);
  } catch (err) {
    console.log("Error in getAllItems:", err.message);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch items" });
  }
};

// Get an item by ID with features and variants
exports.getItemById = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT 
        i.*,
        GROUP_CONCAT(DISTINCT f.features) as item_features
      FROM items i
      LEFT JOIN features f ON FIND_IN_SET(f.id, i.features) > 0
      WHERE i.item_id = ?
      GROUP BY i.item_id`,
      [req.params.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const item = results[0];

    // Features as array
    let features = null;
    if (item.item_features) {
      try {
        features = item.item_features.split(",");
      } catch (_) {
        features = null;
      }
    }

    // Normalize and preserve variant_ids string
    let parsedVariantIds = [];
    let variantIdsRaw = "[]";
    if (item.variant_ids !== undefined && item.variant_ids !== null) {
      if (typeof item.variant_ids === "string") {
        variantIdsRaw = item.variant_ids;
        try {
          parsedVariantIds = JSON.parse(item.variant_ids);
        } catch (_) {
          parsedVariantIds = [];
        }
      } else {
        try {
          parsedVariantIds = Array.isArray(item.variant_ids)
            ? item.variant_ids
            : JSON.parse(item.variant_ids);
        } catch (_) {
          parsedVariantIds = [];
        }
        variantIdsRaw = JSON.stringify(parsedVariantIds);
      }
    }

    let variantsObject = {};
    if (parsedVariantIds.length > 0) {
      const ids = parsedVariantIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      const placeholders = ids.map(() => "?").join(",");
      const [variantRows] = await db
        .promise()
        .query(
          `SELECT id, name, description FROM variants WHERE id IN (${placeholders})`,
          ids
        );
      for (const v of variantRows) {
        const details = parseVariantDescription(v.description) || {};
        variantsObject[v.name] = { id: v.id, ...details };
      }
    }

    const { item_features, ...itemWithoutFeatures } = item;
    return res.json({
      ...itemWithoutFeatures,
      features,
      variant_ids: variantIdsRaw,
      variants: variantsObject,
    });
  } catch (err) {
    console.log("Error in getItemById:", err.message);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch item" });
  }
};

// Get an item by slug with features and variants
exports.getItemBySlug = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT 
        i.*,
        GROUP_CONCAT(DISTINCT f.features) as item_features
      FROM items i
      LEFT JOIN features f ON FIND_IN_SET(f.id, i.features) > 0
      WHERE i.slug = ?
      GROUP BY i.item_id`,
      [req.params.slug]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const item = results[0];

    // Features as array
    let features = null;
    if (item.item_features) {
      try {
        features = item.item_features.split(",");
      } catch (_) {
        features = null;
      }
    }

    // Normalize and preserve variant_ids string
    let parsedVariantIds = [];
    let variantIdsRaw = "[]";
    if (item.variant_ids !== undefined && item.variant_ids !== null) {
      if (typeof item.variant_ids === "string") {
        variantIdsRaw = item.variant_ids;
        try {
          parsedVariantIds = JSON.parse(item.variant_ids);
        } catch (_) {
          parsedVariantIds = [];
        }
      } else {
        try {
          parsedVariantIds = Array.isArray(item.variant_ids)
            ? item.variant_ids
            : JSON.parse(item.variant_ids);
        } catch (_) {
          parsedVariantIds = [];
        }
        variantIdsRaw = JSON.stringify(parsedVariantIds);
      }
    }

    let variantsObject = {};
    if (parsedVariantIds.length > 0) {
      const ids = parsedVariantIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      const placeholders = ids.map(() => "?").join(",");
      const [variantRows] = await db
        .promise()
        .query(
          `SELECT id, name, description FROM variants WHERE id IN (${placeholders})`,
          ids
        );
      for (const v of variantRows) {
        const details = parseVariantDescription(v.description) || {};
        variantsObject[v.name] = { id: v.id, ...details };
      }
    }

    const { item_features, ...itemWithoutFeatures } = item;
    return res.json({
      ...itemWithoutFeatures,
      features,
      variant_ids: variantIdsRaw,
      variants: variantsObject,
    });
  } catch (err) {
    console.log("Error in getItemBySlug:", err.message);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch item" });
  }
};

// Create a new item
exports.createItem = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      price_range,
      price_per_piece,
      features,
      bricks_type,
      material,
      type,
      color,
      size,
      shape,
      porosity,
      stock_qty,
      minimum_order_quantity,
      delivery_time,
      payment_terms,
      supply_capacity,
      main_domestic_market,
      is_active,
      alt_tag, // ✅ alt_tag is in schema
    } = req.body;

    const image_url = req.file ? req.file.path : null; // ✅ correct column name
    const featuresString = Array.isArray(features)
      ? features.join(",")
      : features;

    db.query(
      `INSERT INTO items (
        name, slug, description, price, price_range, price_per_piece, features, 
        bricks_type, material, type, color, size, shape, porosity, 
        stock_qty, minimum_order_quantity, delivery_time, payment_terms, 
        supply_capacity, main_domestic_market, is_active, alt_tag, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        description,
        price,
        price_range,
        price_per_piece,
        featuresString, // ✅ store as string
        bricks_type,
        material,
        type,
        color,
        size,
        shape,
        porosity,
        stock_qty ?? 0,
        minimum_order_quantity ?? 2000,
        delivery_time,
        payment_terms,
        supply_capacity,
        main_domestic_market,
        is_active ?? 1,
        alt_tag || null,
        image_url,
      ],
      (err, result) => {
        if (err) {
          console.error("❌ Error creating item:", err);
          return res.status(500).json({ error: "Database error" });
        }

        res.status(201).json({
          item_id: result.insertId,
          name,
          slug,
          description,
          price,
          price_range,
          price_per_piece,
          features: featuresString,
          bricks_type,
          material,
          type,
          color,
          size,
          shape,
          porosity,
          image_url,
          alt_tag: alt_tag || null,
          stock_qty: stock_qty ?? 0,
          minimum_order_quantity: minimum_order_quantity ?? 2000,
          delivery_time,
          payment_terms,
          supply_capacity,
          main_domestic_market,
          is_active: is_active ?? 1,
        });
      }
    );
  } catch (error) {
    console.error("Error in createItem:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Update an item by ID
exports.updateItem = (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      price_range,
      price_per_piece,
      features,
      bricks_type,
      material,
      type,
      color,
      size,
      shape,
      porosity,
      stock_qty,
      minimum_order_quantity,
      delivery_time,
      payment_terms,
      supply_capacity,
      main_domestic_market,
      is_active,
      alt_tag, // ✅ added alt_tag
    } = req.body;

    const image_url = req.file ? req.file.path : null; // ✅ correct column name
    const featuresString = Array.isArray(features)
      ? features.join(",")
      : features;

    db.query(
      `UPDATE items SET 
        name=?, slug=?, description=?, price=?, price_range=?, price_per_piece=?, 
        features=?, bricks_type=?, material=?, type=?, color=?, size=?, shape=?, porosity=?, 
        image_url=?, alt_tag=?, stock_qty=?, minimum_order_quantity=?, delivery_time=?, payment_terms=?, 
        supply_capacity=?, main_domestic_market=?, is_active=?, updated_at=CURRENT_TIMESTAMP
      WHERE item_id=?`,
      [
        name,
        slug,
        description,
        price,
        price_range,
        price_per_piece,
        featuresString,
        bricks_type,
        material,
        type,
        color,
        size,
        shape,
        porosity,
        image_url, // ✅ fixed
        alt_tag || null,
        stock_qty ?? 0,
        minimum_order_quantity ?? 2000,
        delivery_time,
        payment_terms,
        supply_capacity,
        main_domestic_market,
        is_active ?? 1,
        req.params.id,
      ],
      (err, result) => {
        if (err) {
          console.error("❌ Error updating item:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (result.affectedRows === 0)
          return res.status(404).json({ error: "Item not found" });

        res.json({
          item_id: req.params.id,
          name,
          slug,
          description,
          price,
          price_range,
          price_per_piece,
          features: featuresString,
          bricks_type,
          material,
          type,
          color,
          size,
          shape,
          porosity,
          image_url, // ✅ return correct field
          alt_tag: alt_tag || null,
          stock_qty: stock_qty ?? 0,
          minimum_order_quantity: minimum_order_quantity ?? 2000,
          delivery_time,
          payment_terms,
          supply_capacity,
          main_domestic_market,
          is_active: is_active ?? 1,
        });
      }
    );
  } catch (error) {
    console.error("Error in updateItem:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Delete an item by ID
exports.deleteItem = (req, res) => {
  // First, get the image_url for the item
  db.query(
    "SELECT image_url FROM items WHERE item_id = ?",
    [req.params.id],
    (err, results) => {
      if (err) {
        console.log("Error fetching item for image deletion:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        console.log("Item not found in deleteItem:", req.params.id);
        return res.status(404).json({ error: "Item not found" });
      }
      const image_url = results[0].image_url;
      const publicId = extractPublicId(image_url);
      if (publicId) {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.log("Error deleting image from Cloudinary:", error);
          } else {
            console.log("Cloudinary delete result:", result);
          }
          // Proceed to delete the DB record regardless of Cloudinary result
          db.query(
            "DELETE FROM items WHERE item_id = ?",
            [req.params.id],
            (err, result) => {
              if (err) {
                console.log("Error in deleteItem:", err.message);
                return res.status(500).json({ error: err.message });
              }
              res.json({ message: "Item deleted" });
            }
          );
        });
      } else {
        // No image to delete, just delete the DB record
        db.query(   
          "DELETE FROM items WHERE item_id = ?",
          [req.params.id],
          (err, result) => {
            if (err) {
              console.log("Error in deleteItem:", err.message);
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Item deleted" });
          }
        );
      }
    }
  );
};

// Get items count
exports.getItemsCount = (req, res) => {
  db.query("SELECT COUNT(*) as total_items FROM items", (err, results) => {
    if (err) {
      console.log("Error in getItemsCount:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      total_items: results[0].total_items,
    });
  });
};

// Get active items count
exports.getActiveItemsCount = (req, res) => {
  db.query(
    "SELECT COUNT(*) as active_items FROM items WHERE is_active = 1",
    (err, results) => {
      if (err) {
        console.log("Error in getActiveItemsCount:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({
        active_items: results[0].active_items,
      });
    }
  );
};

// Get low stock items count (items with stock_qty < 10)
exports.getLowStockItemsCount = (req, res) => {
  db.query(
    "SELECT COUNT(*) as low_stock_items FROM items WHERE stock_qty < 10",
    (err, results) => {
      if (err) {
        console.log("Error in getLowStockItemsCount:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({
        low_stock_items: results[0].low_stock_items,
      });
    }
  );
};

/*
Item controller for managing products and inventory items.
This controller handles item creation, updates, and inventory management.
Features:
- Cloudinary image upload for item images
- Complete CRUD operations for item management
- Stock quantity tracking
- Active/inactive status management
- Error handling and validation
*/

// Get all items with their categories and features
exports.getItemsWithCategories = (req, res) => {
  const query = `
    SELECT 
      i.item_id,
      i.name as item_name,
      i.description as item_description,
      i.price_range as item_price_range,
      i.price_per_piece as item_price_per_piece,
      i.image_url as item_image_url,
      i.stock_qty,
      i.is_active as item_is_active,
      i.created_at as item_created_at,
      i.updated_at as item_updated_at,
      i.bricks_type,
      i.material,
      i.type,
      i.color,
      i.size,
      i.shape,
      i.porosity,
      GROUP_CONCAT(DISTINCT f.features) as item_features,
      c.category_id,
      c.name as category_name,
      c.description as category_description,
      c.image_url as category_image_url,
      c.is_active as category_is_active
    FROM items i
    LEFT JOIN features f ON FIND_IN_SET(f.id, i.features) > 0
    LEFT JOIN category_items ci ON i.item_id = ci.item_id
    LEFT JOIN categories c ON ci.category_id = c.category_id
    WHERE i.is_active = 1
    GROUP BY i.item_id, c.category_id
    ORDER BY i.item_id, c.category_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.log("Error in getItemsWithCategories:", err.message);
      return res.status(500).json({ error: err.message });
    }
    const itemsMap = new Map();
    results.forEach((row) => {
      const itemId = row.item_id;
      if (!itemsMap.has(itemId)) {
        itemsMap.set(itemId, {
          item_id: row.item_id,
          name: row.item_name,
          description: row.item_description,
          price_range: row.item_price_range,
          price_per_piece: row.item_price_per_piece,
          image_url: row.item_image_url,
          stock_qty: row.stock_qty,
          is_active: row.item_is_active,
          created_at: row.item_created_at,
          updated_at: row.item_updated_at,
          bricks_type: row.bricks_type,
          material: row.material,
          type: row.type,
          color: row.color,
          size: row.size,
          shape: row.shape,
          porosity: row.porosity,
          features: row.item_features ? row.item_features.split(",") : null,
          categories: [],
        });
      }
      if (row.category_id) {
        const item = itemsMap.get(itemId);
        item.categories.push({
          category_id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          image_url: row.category_image_url,
          is_active: row.category_is_active,
        });
      }
    });
    res.json(Array.from(itemsMap.values()));
  });
};

// Get categories for a specific item
exports.getItemCategories = (req, res) => {
  const itemId = req.params.id;
  const query = `
    SELECT c.*
    FROM categories c
    INNER JOIN category_items ci ON c.category_id = ci.category_id
    WHERE ci.item_id = ? AND c.is_active = 1
    ORDER BY c.name
  `;
  db.query(query, [itemId], (err, results) => {
    if (err) {
      console.log("Error getting item categories:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Add an item to a category
exports.addItemToCategory = (req, res) => {
  const { category_id, item_id } = req.body;
  if (!category_id || !item_id) {
    return res
      .status(400)
      .json({ error: "category_id and item_id are required" });
  }
  db.query(
    "SELECT * FROM category_items WHERE category_id = ? AND item_id = ?",
    [category_id, item_id],
    (err, results) => {
      if (err) {
        console.log("Error checking category-item relationship:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (results.length > 0) {
        return res
          .status(400)
          .json({ error: "Item is already connected to this category" });
      }
      db.query(
        "INSERT INTO category_items (category_id, item_id) VALUES (?, ?)",
        [category_id, item_id],
        (err, result) => {
          if (err) {
            console.log("Error adding item to category:", err.message);
            return res.status(500).json({ error: err.message });
          }
          res.json({
            message: "Item added to category successfully",
            id: result.insertId,
          });
        }
      );
    }
  );
};

// Remove an item from a category
exports.removeItemFromCategory = (req, res) => {
  const { category_id, item_id } = req.params;
  db.query(
    "DELETE FROM category_items WHERE category_id = ? AND item_id = ?",
    [category_id, item_id],
    (err, result) => {
      if (err) {
        console.log("Error removing item from category:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Category-item relationship not found" });
      }
      res.json({ message: "Item removed from category successfully" });
    }
  );
};

// Link multiple variants to an item (merge unique IDs)
exports.linkVariantsToItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const variantIds =
      req.body && Array.isArray(req.body.variant_ids)
        ? req.body.variant_ids
        : [];
    if (Number.isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item id" });
    }
    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return res
        .status(400)
        .json({ error: "variant_ids must be a non-empty array" });
    }

    // Validate variants exist (using actual PK `id`)
    const uniqueIds = Array.from(
      new Set(
        variantIds.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      )
    );
    if (uniqueIds.length === 0) {
      return res.status(400).json({ error: "No valid variant ids provided" });
    }
    const placeholders = uniqueIds.map(() => "?").join(",");
    const [existing] = await db
      .promise()
      .query(
        `SELECT id FROM variants WHERE id IN (${placeholders})`,
        uniqueIds
      );
    const validIdsSet = new Set(existing.map((r) => Number(r.id)));
    if (validIdsSet.size === 0) {
      return res
        .status(400)
        .json({ error: "Provided variant ids do not exist" });
    }

    // Get current variant_ids
    const [itemRows] = await db
      .promise()
      .query("SELECT variant_ids FROM items WHERE item_id = ? LIMIT 1", [
        itemId,
      ]);
    if (itemRows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    let current = [];
    if (itemRows[0].variant_ids) {
      try {
        current = Array.isArray(itemRows[0].variant_ids)
          ? itemRows[0].variant_ids
          : JSON.parse(itemRows[0].variant_ids);
      } catch (_) {
        current = [];
      }
    }
    const mergedSet = new Set([
      ...current.map((n) => Number(n)).filter((n) => Number.isFinite(n)),
      ...Array.from(validIdsSet),
    ]);
    const merged = Array.from(mergedSet);

    await db
      .promise()
      .query("UPDATE items SET variant_ids = ? WHERE item_id = ?", [
        JSON.stringify(merged),
        itemId,
      ]);

    return res.json({ item_id: itemId, variant_ids: merged });
  } catch (error) {
    console.error("Error in linkVariantsToItem:", error);
    return res.status(500).json({ error: "Failed to link variants" });
  }
};

// Unlink a specific variant from an item
exports.unlinkVariantFromItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const variantId = parseInt(req.params.variantId, 10);
    if (Number.isNaN(itemId) || Number.isNaN(variantId)) {
      return res.status(400).json({ error: "Invalid ids" });
    }

    const [itemRows] = await db
      .promise()
      .query("SELECT variant_ids FROM items WHERE item_id = ? LIMIT 1", [
        itemId,
      ]);
    if (itemRows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    let current = [];
    if (itemRows[0].variant_ids) {
      try {
        current = Array.isArray(itemRows[0].variant_ids)
          ? itemRows[0].variant_ids
          : JSON.parse(itemRows[0].variant_ids);
      } catch (_) {
        current = [];
      }
    }
    const next = current
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n !== variantId);

    await db
      .promise()
      .query("UPDATE items SET variant_ids = ? WHERE item_id = ?", [
        JSON.stringify(next),
        itemId,
      ]);

    return res.json({ item_id: itemId, variant_ids: next });
  } catch (error) {
    console.error("Error in unlinkVariantFromItem:", error);
    return res.status(500).json({ error: "Failed to unlink variant" });
  }
};
