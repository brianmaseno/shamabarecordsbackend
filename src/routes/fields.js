const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { computeStatus } = require('../utils/status');

const VALID_STAGES = ['Planted', 'Growing', 'Ready', 'Harvested'];

function withStatus(field) {
  return { ...field, status: computeStatus(field.stage, field.planting_date) };
}

// GET /api/fields — admin sees all, agent sees assigned
router.get('/', authenticate, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query(`
        SELECT f.*, u.name AS agent_name, u.email AS agent_email
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        ORDER BY f.updated_at DESC
      `);
    } else {
      [rows] = await pool.query(`
        SELECT f.*, u.name AS agent_name, u.email AS agent_email
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        WHERE f.assigned_agent_id = ?
        ORDER BY f.updated_at DESC
      `, [req.user.id]);
    }
    res.json(rows.map(withStatus));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fields/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*, u.name AS agent_name, u.email AS agent_email
      FROM fields f
      LEFT JOIN users u ON f.assigned_agent_id = u.id
      WHERE f.id = ?
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'Field not found' });

    const field = rows[0];
    if (req.user.role !== 'admin' && field.assigned_agent_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(withStatus(field));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/fields — admin only
router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty(),
  body('crop_type').trim().notEmpty(),
  body('planting_date').isDate(),
  body('stage').optional().isIn(VALID_STAGES),
  body('assigned_agent_id').optional({ nullable: true }).isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  }

  const { name, crop_type, planting_date, stage = 'Planted', assigned_agent_id, notes } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO fields (name, crop_type, planting_date, stage, assigned_agent_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, crop_type, planting_date, stage, assigned_agent_id || null, notes || null, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM fields WHERE id = ?', [result.insertId]);
    res.status(201).json(withStatus(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/fields/:id — admin only
router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('crop_type').optional().trim().notEmpty(),
  body('planting_date').optional().isDate(),
  body('stage').optional().isIn(VALID_STAGES),
  body('assigned_agent_id').optional({ nullable: true })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  }

  const { id } = req.params;
  const { name, crop_type, planting_date, stage, assigned_agent_id, notes } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM fields WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Field not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (crop_type !== undefined) updates.crop_type = crop_type;
    if (planting_date !== undefined) updates.planting_date = planting_date;
    if (stage !== undefined) updates.stage = stage;
    if (assigned_agent_id !== undefined) updates.assigned_agent_id = assigned_agent_id || null;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE fields SET ${setClauses} WHERE id = ?`, values);

    const [rows] = await pool.query(`
      SELECT f.*, u.name AS agent_name, u.email AS agent_email
      FROM fields f LEFT JOIN users u ON f.assigned_agent_id = u.id
      WHERE f.id = ?
    `, [id]);

    res.json(withStatus(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/fields/:id — admin only
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM fields WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Field not found' });

    await pool.query('DELETE FROM fields WHERE id = ?', [req.params.id]);
    res.json({ message: 'Field deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
