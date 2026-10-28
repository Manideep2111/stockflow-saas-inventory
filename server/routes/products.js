const express = require('express');
const { db, generateId } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/products - list all products for current org (with optional search and low_stock filter)
router.get('/', (req, res) => {
  try {
    const { search, filter } = req.query;
    const orgId = req.organizationId;
    const defaultThreshold = req.organization.defaultLowStockThreshold || 5;

    let query = `
      SELECT 
        p.id,
        p.organization_id,
        p.name,
        p.sku,
        p.description,
        p.quantity_on_hand,
        p.cost_price,
        p.selling_price,
        p.low_stock_threshold,
        p.last_updated_by,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.quantity_on_hand <= COALESCE(p.low_stock_threshold, ?) THEN 1 
          ELSE 0 
        END AS is_low_stock,
        COALESCE(p.low_stock_threshold, ?) AS effective_threshold
      FROM products p
      WHERE p.organization_id = ?
    `;

    const params = [defaultThreshold, defaultThreshold, orgId];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filter === 'low_stock') {
      query += ` AND p.quantity_on_hand <= COALESCE(p.low_stock_threshold, ?)`;
      params.push(defaultThreshold);
    }

    query += ` ORDER BY p.updated_at DESC`;

    const products = db.prepare(query).all(...params);
    return res.json({ products });
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id - single product detail
router.get('/:id', (req, res) => {
  try {
    const orgId = req.organizationId;
    const defaultThreshold = req.organization.defaultLowStockThreshold || 5;

    const product = db.prepare(`
      SELECT 
        p.*,
        CASE 
          WHEN p.quantity_on_hand <= COALESCE(p.low_stock_threshold, ?) THEN 1 
          ELSE 0 
        END AS is_low_stock,
        COALESCE(p.low_stock_threshold, ?) AS effective_threshold
      FROM products p
      WHERE p.id = ? AND p.organization_id = ?
    `).get(defaultThreshold, defaultThreshold, req.params.id, orgId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Also fetch recent stock movements for this product
    const adjustments = db.prepare(`
      SELECT * FROM stock_adjustments 
      WHERE product_id = ? AND organization_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).all(product.id, orgId);

    return res.json({ product, adjustments });
  } catch (err) {
    console.error('Fetch product error:', err);
    return res.status(500).json({ error: 'Failed to fetch product details.' });
  }
});

// POST /api/products - create new product
router.post('/', (req, res) => {
  try {
    const orgId = req.organizationId;
    const {
      name,
      sku,
      description,
      quantityOnHand,
      costPrice,
      sellingPrice,
      lowStockThreshold
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: 'SKU is required.' });
    }

    const trimmedSku = sku.trim().toUpperCase();

    // Check unique SKU per organization
    const existingSku = db.prepare(`
      SELECT id FROM products WHERE organization_id = ? AND sku = ?
    `).get(orgId, trimmedSku);

    if (existingSku) {
      return res.status(400).json({ error: `SKU '${trimmedSku}' already exists in your organization.` });
    }

    const qty = parseInt(quantityOnHand, 10);
    const parsedQty = isNaN(qty) ? 0 : Math.max(0, qty);
    const parsedCost = costPrice === '' || costPrice === null || costPrice === undefined ? null : parseFloat(costPrice);
    const parsedSelling = sellingPrice === '' || sellingPrice === null || sellingPrice === undefined ? null : parseFloat(sellingPrice);
    const parsedThreshold = lowStockThreshold === '' || lowStockThreshold === null || lowStockThreshold === undefined ? null : parseInt(lowStockThreshold, 10);

    const productId = generateId();

    db.prepare(`
      INSERT INTO products (
        id, organization_id, name, sku, description,
        quantity_on_hand, cost_price, selling_price, low_stock_threshold,
        last_updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId,
      orgId,
      name.trim(),
      trimmedSku,
      description ? description.trim() : null,
      parsedQty,
      isNaN(parsedCost) ? null : parsedCost,
      isNaN(parsedSelling) ? null : parsedSelling,
      isNaN(parsedThreshold) ? null : parsedThreshold,
      req.user.email
    );

    const createdProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);

    return res.status(201).json({
      message: 'Product created successfully!',
      product: createdProduct
    });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/products/:id - update product
router.put('/:id', (req, res) => {
  try {
    const orgId = req.organizationId;
    const productId = req.params.id;

    // Check existence
    const product = db.prepare(`
      SELECT * FROM products WHERE id = ? AND organization_id = ?
    `).get(productId, orgId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const {
      name,
      sku,
      description,
      quantityOnHand,
      costPrice,
      sellingPrice,
      lowStockThreshold
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: 'SKU is required.' });
    }

    const trimmedSku = sku.trim().toUpperCase();

    // Check unique SKU per org excluding current product
    const existingSku = db.prepare(`
      SELECT id FROM products WHERE organization_id = ? AND sku = ? AND id != ?
    `).get(orgId, trimmedSku, productId);

    if (existingSku) {
      return res.status(400).json({ error: `SKU '${trimmedSku}' is already taken by another product.` });
    }

    const qty = parseInt(quantityOnHand, 10);
    const parsedQty = isNaN(qty) ? product.quantity_on_hand : Math.max(0, qty);
    const parsedCost = costPrice === '' || costPrice === null || costPrice === undefined ? null : parseFloat(costPrice);
    const parsedSelling = sellingPrice === '' || sellingPrice === null || sellingPrice === undefined ? null : parseFloat(sellingPrice);
    const parsedThreshold = lowStockThreshold === '' || lowStockThreshold === null || lowStockThreshold === undefined ? null : parseInt(lowStockThreshold, 10);

    db.prepare(`
      UPDATE products SET
        name = ?,
        sku = ?,
        description = ?,
        quantity_on_hand = ?,
        cost_price = ?,
        selling_price = ?,
        low_stock_threshold = ?,
        last_updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?
    `).run(
      name.trim(),
      trimmedSku,
      description ? description.trim() : null,
      parsedQty,
      isNaN(parsedCost) ? null : parsedCost,
      isNaN(parsedSelling) ? null : parsedSelling,
      isNaN(parsedThreshold) ? null : parsedThreshold,
      req.user.email,
      productId,
      orgId
    );

    const updatedProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);

    return res.json({
      message: 'Product updated successfully!',
      product: updatedProduct
    });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
});

// POST /api/products/:id/adjust-stock - quick inline stock adjustment (+/- N units with note)
router.post('/:id/adjust-stock', (req, res) => {
  try {
    const orgId = req.organizationId;
    const productId = req.params.id;
    const { delta, note } = req.body;

    const parsedDelta = parseInt(delta, 10);
    if (isNaN(parsedDelta) || parsedDelta === 0) {
      return res.status(400).json({ error: 'Delta must be a non-zero integer (+N or -N).' });
    }

    const product = db.prepare(`
      SELECT * FROM products WHERE id = ? AND organization_id = ?
    `).get(productId, orgId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const previousQty = product.quantity_on_hand;
    const newQty = previousQty + parsedDelta;

    if (newQty < 0) {
      return res.status(400).json({
        error: `Cannot reduce stock by ${Math.abs(parsedDelta)}. Current stock is only ${previousQty}.`
      });
    }

    const adjustTx = db.transaction(() => {
      // Update product quantity
      db.prepare(`
        UPDATE products SET
          quantity_on_hand = ?,
          last_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND organization_id = ?
      `).run(newQty, req.user.email, productId, orgId);

      // Record adjustment history
      db.prepare(`
        INSERT INTO stock_adjustments (
          id, product_id, organization_id, delta, previous_quantity, new_quantity, note, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        productId,
        orgId,
        parsedDelta,
        previousQty,
        newQty,
        note ? note.trim() : null,
        req.user.email
      );
    });

    adjustTx();

    const updatedProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);

    return res.json({
      message: `Stock updated successfully (${parsedDelta > 0 ? '+' : ''}${parsedDelta} units).`,
      product: updatedProduct
    });
  } catch (err) {
    console.error('Stock adjustment error:', err);
    return res.status(500).json({ error: 'Failed to adjust stock.' });
  }
});

// DELETE /api/products/:id - hard delete product
router.delete('/:id', (req, res) => {
  try {
    const orgId = req.organizationId;
    const productId = req.params.id;

    const result = db.prepare(`
      DELETE FROM products WHERE id = ? AND organization_id = ?
    `).run(productId, orgId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
