const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'stockflow.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode and foreign keys for performance and data integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      default_low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      description TEXT,
      quantity_on_hand INTEGER NOT NULL DEFAULT 0,
      cost_price REAL,
      selling_price REAL,
      low_stock_threshold INTEGER,
      last_updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, sku)
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      note TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
    CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // Seed demo organization and user if database is empty
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync('StockFlow2026_Secure!', 10);

    const seedTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO organizations (id, name, default_low_stock_threshold)
        VALUES (?, 'Demo Electronics Store', 5)
      `).run(orgId);

      db.prepare(`
        INSERT INTO users (id, organization_id, email, password_hash)
        VALUES (?, ?, 'demo@stockflow.io', ?)
      `).run(userId, orgId, passwordHash);

      const insertProd = db.prepare(`
        INSERT INTO products (id, organization_id, name, sku, description, quantity_on_hand, cost_price, selling_price, low_stock_threshold, last_updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo@stockflow.io')
      `);

      insertProd.run(crypto.randomUUID(), orgId, 'Ergonomic Wireless Mouse', 'TECH-001', '2.4G Rechargeable mouse', 18, 15.00, 29.99, 5);
      insertProd.run(crypto.randomUUID(), orgId, 'USB-C Braided Cable (2m)', 'CBL-102', '100W Fast charging cable', 3, 3.50, 12.99, 5); // Low stock!
      insertProd.run(crypto.randomUUID(), orgId, 'Mechanical Keyboard (Brown)', 'KB-204', 'Tenkeyless RGB gaming keyboard', 2, 45.00, 79.99, 4); // Low stock!
      insertProd.run(crypto.randomUUID(), orgId, '4K UltraHD Webcam', 'CAM-300', '1080p/4K 60fps streaming webcam', 12, 55.00, 99.00, 5);
      insertProd.run(crypto.randomUUID(), orgId, 'Desk Cable Organizer Clips', 'ACC-010', 'Pack of 6 silicone clips', 45, 1.20, 6.99, 10);
    });

    seedTx();
    console.log('✓ Seeded demo account: demo@stockflow.io / demo1234');
  }
}

initDb();

module.exports = {
  db,
  generateId: () => crypto.randomUUID()
};
