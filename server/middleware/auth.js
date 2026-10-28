const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'stockflow-mvp-super-secret-key-2026';

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/, '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user & organization context from database
    const user = db.prepare(`
      SELECT u.id, u.email, u.organization_id, o.name AS organization_name, o.default_low_stock_threshold
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = ?
    `).get(decoded.userId);

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User or Organization no longer exists.' });
    }

    req.user = {
      id: user.id,
      email: user.email
    };
    req.organizationId = user.organization_id;
    req.organization = {
      id: user.organization_id,
      name: user.organization_name,
      defaultLowStockThreshold: user.default_low_stock_threshold
    };

    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
