const db = require('../db');

function serializeDescription(description) {
  if (description === null || description === undefined) return null;
  if (typeof description === 'object') {
    try { return JSON.stringify(description); } catch (_) { return null; }
  }
  if (typeof description === 'string') return description;
  return String(description);
}

function parseDescription(desc) {
  if (typeof desc !== 'string') return desc;
  try {
    const parsed = JSON.parse(desc);
    return parsed;
  } catch (_) {
    return desc;
  }
}

// Create a new variant
exports.createVariant = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Variant name is required' });
    }

    const descriptionStr = serializeDescription(description);

    const [result] = await db.promise().query(
      'INSERT INTO variants (name, description) VALUES (?, ?)',
      [name.trim(), descriptionStr]
    );

    const insertId = result.insertId;
    const [rows] = await db.promise().query(
      'SELECT id, name, description, created_at FROM variants WHERE id = ? LIMIT 1',
      [insertId]
    );

    const row = rows[0];
    return res.status(201).json({ ...row, description: parseDescription(row.description) });
  } catch (error) {
    console.error('Error in createVariant:', error);
    return res.status(500).json({ error: 'Failed to create variant' });
  }
};

// Get all variants
exports.getAllVariants = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id, name, description, created_at FROM variants ORDER BY created_at DESC'
    );
    return res.json(rows.map(r => ({ ...r, description: parseDescription(r.description) })));
  } catch (error) {
    console.error('Error in getAllVariants:', error);
    return res.status(500).json({ error: 'Failed to fetch variants' });
  }
};

// Get variant by ID
exports.getVariantById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid variant id' });
    }

    const [rows] = await db.promise().query(
      'SELECT id, name, description, created_at FROM variants WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const row = rows[0];
    return res.json({ ...row, description: parseDescription(row.description) });
  } catch (error) {
    console.error('Error in getVariantById:', error);
    return res.status(500).json({ error: 'Failed to fetch variant' });
  }
};

// Update variant by ID
exports.updateVariant = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid variant id' });
    }

    const { name, description } = req.body;
    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Variant name cannot be empty' });
    }

    const descriptionStr = description === undefined ? undefined : serializeDescription(description);

    const [result] = await db.promise().query(
      'UPDATE variants SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',[
        name !== undefined ? name.trim() : null,
        descriptionStr !== undefined ? descriptionStr : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const [rows] = await db.promise().query(
      'SELECT id, name, description, created_at FROM variants WHERE id = ? LIMIT 1',
      [id]
    );

    const row = rows[0];
    return res.json({ ...row, description: parseDescription(row.description) });
  } catch (error) {
    console.error('Error in updateVariant:', error);
    return res.status(500).json({ error: 'Failed to update variant' });
  }
};

// Delete variant by ID
exports.deleteVariant = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid variant id' });
    }

    const [result] = await db.promise().query(
      'DELETE FROM variants WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    return res.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Error in deleteVariant:', error);
    return res.status(500).json({ error: 'Failed to delete variant' });
  }
}; 