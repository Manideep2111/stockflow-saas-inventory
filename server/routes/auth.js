const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, generateId } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Helper to set JWT cookie
function sendAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, confirmPassword, organizationName } = req.body;

    // Validation
    if (!email || !password || !organizationName) {
      return res.status(400).json({ error: 'Email, password, and organization name are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOrgName = organizationName.trim();

    // Check existing email
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const orgId = generateId();
    const userId = generateId();

    // Create Org and User in a transaction
    const signupTx = db.transaction(() => {
      // Create Organization
      db.prepare(`
        INSERT INTO organizations (id, name, default_low_stock_threshold)
        VALUES (?, ?, 5)
      `).run(orgId, trimmedOrgName);

      // Create User
      db.prepare(`
        INSERT INTO users (id, organization_id, email, password_hash)
        VALUES (?, ?, ?, ?)
      `).run(userId, orgId, trimmedEmail, passwordHash);

      // Seed 3 starter sample products to showcase the dashboard and low-stock feature immediately
      const insertProduct = db.prepare(`
        INSERT INTO products (id, organization_id, name, sku, description, quantity_on_hand, cost_price, selling_price, low_stock_threshold, last_updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertProduct.run(
        generateId(),
        orgId,
        'Ergonomic Wireless Mouse',
        'TECH-001',
        '2.4G Rechargeable wireless optical mouse',
        18,
        15.00,
        29.99,
        5,
        trimmedEmail
      );

      insertProduct.run(
        generateId(),
        orgId,
        'USB-C Braided Cable (2m)',
        'CBL-102',
        '100W Fast charging heavy-duty cable',
        3, // Low stock item! (<= 5)
        3.50,
        12.99,
        5,
        trimmedEmail
      );

      insertProduct.run(
        generateId(),
        orgId,
        'Mechanical Gaming Keyboard',
        'KB-204',
        'Tenkeyless RGB mechanical keyboard with brown switches',
        2, // Low stock item! (custom threshold 4, qty 2 <= 4)
        45.00,
        79.99,
        4,
        trimmedEmail
      );
    });

    signupTx();

    // Generate JWT
    const token = jwt.sign(
      { userId, email: trimmedEmail, organizationId: orgId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.status(201).json({
      message: 'Signup successful!',
      user: { id: userId, email: trimmedEmail },
      organization: { id: orgId, name: trimmedOrgName, defaultLowStockThreshold: 5 }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error during signup. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const user = db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.organization_id, o.name AS organization_name, o.default_low_stock_threshold
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = ?
    `).get(trimmedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, organizationId: user.organization_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.json({
      message: 'Login successful!',
      user: { id: user.id, email: user.email },
      organization: {
        id: user.organization_id,
        name: user.organization_name,
        defaultLowStockThreshold: user.default_low_stock_threshold
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    user: req.user,
    organization: req.organization
  });
});

module.exports = router;
