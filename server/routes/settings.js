const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/settings - get current organization settings
router.get('/', (req, res) => {
  try {
    const orgId = req.organizationId;
    const org = db.prepare(`
      SELECT id, name, default_low_stock_threshold, created_at, updated_at
      FROM organizations
      WHERE id = ?
    `).get(orgId);

    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    return res.json({
      organization: {
        id: org.id,
        name: org.name,
        defaultLowStockThreshold: org.default_low_stock_threshold,
        createdAt: org.created_at,
        updatedAt: org.updated_at
      }
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    return res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// PUT /api/settings - update organization settings
router.put('/', (req, res) => {
  try {
    const orgId = req.organizationId;
    const { name, defaultLowStockThreshold } = req.body;

    const parsedThreshold = parseInt(defaultLowStockThreshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ error: 'Default Low Stock Threshold must be a non-negative integer.' });
    }

    const orgName = name && name.trim() ? name.trim() : req.organization.name;

    db.prepare(`
      UPDATE organizations
      SET name = ?, default_low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(orgName, parsedThreshold, orgId);

    const updatedOrg = db.prepare(`
      SELECT id, name, default_low_stock_threshold, created_at, updated_at
      FROM organizations
      WHERE id = ?
    `).get(orgId);

    return res.json({
      message: 'Settings updated successfully!',
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        defaultLowStockThreshold: updatedOrg.default_low_stock_threshold,
        createdAt: updatedOrg.created_at,
        updatedAt: updatedOrg.updated_at
      }
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

module.exports = router;
