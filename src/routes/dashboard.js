const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { computeStatus } = require('../utils/status');

// GET /api/dashboard/admin — admin summary
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const [fields] = await pool.query(`
      SELECT f.*, u.name AS agent_name
      FROM fields f
      LEFT JOIN users u ON f.assigned_agent_id = u.id
    `);

    const withStatus = fields.map(f => ({ ...f, status: computeStatus(f.stage, f.planting_date) }));

    const summary = {
      total: withStatus.length,
      byStatus: {
        Active: withStatus.filter(f => f.status === 'Active').length,
        'At Risk': withStatus.filter(f => f.status === 'At Risk').length,
        Completed: withStatus.filter(f => f.status === 'Completed').length
      },
      byStage: {
        Planted: withStatus.filter(f => f.stage === 'Planted').length,
        Growing: withStatus.filter(f => f.stage === 'Growing').length,
        Ready: withStatus.filter(f => f.stage === 'Ready').length,
        Harvested: withStatus.filter(f => f.stage === 'Harvested').length
      },
      unassigned: withStatus.filter(f => !f.assigned_agent_id).length,
      atRiskFields: withStatus.filter(f => f.status === 'At Risk').map(f => ({ id: f.id, name: f.name, stage: f.stage, agent_name: f.agent_name }))
    };

    const [agentCount] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE role = ?', ['agent']);
    summary.totalAgents = agentCount[0].count;

    const [recentUpdates] = await pool.query(`
      SELECT fu.id, fu.stage, fu.notes, fu.created_at, u.name AS agent_name, f.name AS field_name
      FROM field_updates fu
      JOIN users u ON fu.agent_id = u.id
      JOIN fields f ON fu.field_id = f.id
      ORDER BY fu.created_at DESC
      LIMIT 10
    `);
    summary.recentUpdates = recentUpdates;

    res.json(summary);
  } catch (err) {
    console.error('Dashboard admin error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/dashboard/agent — agent summary
router.get('/agent', authenticate, async (req, res) => {
  try {
    const [fields] = await pool.query(`
      SELECT * FROM fields WHERE assigned_agent_id = ?
    `, [req.user.id]);

    const withStatus = fields.map(f => ({ ...f, status: computeStatus(f.stage, f.planting_date) }));

    const summary = {
      total: withStatus.length,
      byStatus: {
        Active: withStatus.filter(f => f.status === 'Active').length,
        'At Risk': withStatus.filter(f => f.status === 'At Risk').length,
        Completed: withStatus.filter(f => f.status === 'Completed').length
      },
      byStage: {
        Planted: withStatus.filter(f => f.stage === 'Planted').length,
        Growing: withStatus.filter(f => f.stage === 'Growing').length,
        Ready: withStatus.filter(f => f.stage === 'Ready').length,
        Harvested: withStatus.filter(f => f.stage === 'Harvested').length
      },
      atRiskFields: withStatus.filter(f => f.status === 'At Risk').map(f => ({ id: f.id, name: f.name, stage: f.stage }))
    };

    const [recentUpdates] = await pool.query(`
      SELECT fu.id, fu.stage, fu.notes, fu.created_at, f.name AS field_name
      FROM field_updates fu
      JOIN fields f ON fu.field_id = f.id
      WHERE fu.agent_id = ?
      ORDER BY fu.created_at DESC
      LIMIT 10
    `, [req.user.id]);
    summary.recentUpdates = recentUpdates;

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
