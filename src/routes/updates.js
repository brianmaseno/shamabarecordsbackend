const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const VALID_STAGES = ['Planted', 'Growing', 'Ready', 'Harvested'];

// GET /api/updates?field_id=X — get updates for a field
router.get('/', authenticate, async (req, res) => {
  const { field_id } = req.query;
  try {
    let query, params;

    if (field_id) {
      if (req.user.role !== 'admin') {
        const [field] = await pool.query('SELECT assigned_agent_id FROM fields WHERE id = ?', [field_id]);
        if (field.length === 0 || field[0].assigned_agent_id !== req.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      query = `
        SELECT fu.*, u.name AS agent_name, f.name AS field_name
        FROM field_updates fu
        JOIN users u ON fu.agent_id = u.id
        JOIN fields f ON fu.field_id = f.id
        WHERE fu.field_id = ?
        ORDER BY fu.created_at DESC
      `;
      params = [field_id];
    } else if (req.user.role === 'admin') {
      query = `
        SELECT fu.*, u.name AS agent_name, f.name AS field_name
        FROM field_updates fu
        JOIN users u ON fu.agent_id = u.id
        JOIN fields f ON fu.field_id = f.id
        ORDER BY fu.created_at DESC
        LIMIT 50
      `;
      params = [];
    } else {
      query = `
        SELECT fu.*, u.name AS agent_name, f.name AS field_name
        FROM field_updates fu
        JOIN users u ON fu.agent_id = u.id
        JOIN fields f ON fu.field_id = f.id
        WHERE f.assigned_agent_id = ?
        ORDER BY fu.created_at DESC
        LIMIT 50
      `;
      params = [req.user.id];
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/updates — agent or admin logs a field update
router.post('/', authenticate, [
  body('field_id').isInt(),
  body('stage').isIn(VALID_STAGES),
  body('notes').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  }

  const { field_id, stage, notes } = req.body;

  try {
    const [fieldRows] = await pool.query('SELECT * FROM fields WHERE id = ?', [field_id]);
    if (fieldRows.length === 0) return res.status(404).json({ message: 'Field not found' });

    const field = fieldRows[0];
    if (req.user.role !== 'admin' && field.assigned_agent_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not assigned to this field' });
    }

    // Insert update log
    const [result] = await pool.query(
      'INSERT INTO field_updates (field_id, agent_id, stage, notes) VALUES (?, ?, ?, ?)',
      [field_id, req.user.id, stage, notes || null]
    );

    // Update the field stage and notes
    await pool.query('UPDATE fields SET stage = ?, notes = ? WHERE id = ?', [stage, notes || field.notes, field_id]);

    const [rows] = await pool.query(`
      SELECT fu.*, u.name AS agent_name, f.name AS field_name
      FROM field_updates fu
      JOIN users u ON fu.agent_id = u.id
      JOIN fields f ON fu.field_id = f.id
      WHERE fu.id = ?
    `, [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
