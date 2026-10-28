const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/dashboard - overview metrics and low-stock table
router.get('/', (req, res) => {
  try {
    const orgId = req.organizationId;
    const defaultThreshold = req.organization.defaultLowStockThreshold || 5;

    // Total products & sum of quantity on hand
    const statsRow = db.prepare(`
      SELECT 
        COUNT(*) AS total_products,
        COALESCE(SUM(quantity_on_hand), 0) AS total_quantity,
        COALESCE(SUM(quantity_on_hand * COALESCE(selling_price, 0)), 0) AS total_inventory_value
      FROM products
      WHERE organization_id = ?
    `).get(orgId);

    // Low stock items: quantity_on_hand <= COALESCE(low_stock_threshold, defaultThreshold)
    const lowStockItems = db.prepare(`
      SELECT 
        id,
        name,
        sku,
        quantity_on_hand,
        COALESCE(low_stock_threshold, ?) AS effective_threshold,
        selling_price,
        cost_price,
        updated_at
      FROM products
      WHERE organization_id = ? 
        AND quantity_on_hand <= COALESCE(low_stock_threshold, ?)
      ORDER BY quantity_on_hand ASC, name ASC
    `).all(defaultThreshold, orgId, defaultThreshold);

    return res.json({
      stats: {
        totalProducts: statsRow.total_products,
        totalQuantityOnHand: statsRow.total_quantity,
        lowStockCount: lowStockItems.length,
        totalInventoryValue: statsRow.total_inventory_value,
        defaultLowStockThreshold: defaultThreshold
      },
      lowStockItems
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard metrics.' });
  }
});

module.exports = router;
