# StockFlow MVP (v0.1) - SaaS Inventory Management System

A multi-tenant SaaS inventory management web application built strictly according to the **Phase 1 – 6-Hour MVP PRD: SaaS Inventory Management System (StockFlow MVP)** specification.

---

## 🚀 Live Demo & Deployment URL

- **Live URL**: [https://fort-parallel-buying-sie.trycloudflare.com](https://fort-parallel-buying-sie.trycloudflare.com)
- **Demo Account**:
  - **Email**: `demo@stockflow.io`
  - **Password**: `demo1234`
  - **Organization**: `Demo Electronics Store`
- Or click **"Create Account"** to create your own isolated tenant organization!

---

## 📋 PRD Feature Compliance Matrix

| PRD Section | Requirement | Implementation Status | Notes |
| :--- | :--- | :---: | :--- |
| **FR-1** | Signup & Login | **Completed** | Full email/password validation, bcrypt hashing, JWT HTTP-only cookie sessions. |
| **FR-2** | Organization Context | **Completed** | Auto-creates tenant Organization record; all products and settings are strictly scoped by `organization_id`. |
| **FR-3** | Product Model | **Completed** | Name, SKU (unique per org), Description, Quantity on Hand, Cost Price, Selling Price, Low Stock Threshold, Timestamps, and `last_updated_by`. |
| **FR-4** | Product CRUD | **Completed** | Full Create, Read with Search & filter, Update modal, and Hard Delete with confirmation dialog. |
| **FR-5** | Simple Stock Updates | **Completed** | Direct edit in product modal + Quick "+/- Restock" inline adjustment modal with audit note. |
| **FR-6** | Dashboard Overview | **Completed** | Real-time KPI summary cards (Total Products, Total Units, Low Stock Alert Count, Retail Value) + dedicated Low Stock Items table. |
| **FR-7** | Global Settings | **Completed** | Configurable Organization Default Low Stock Threshold (default: 5), dynamically inherited by products without custom thresholds. |

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express 5 (REST API, JWT authentication, cookie sessions)
- **Database**: SQLite (via `better-sqlite3` with WAL mode and composite unique constraint `(organization_id, sku)`)
- **Frontend**: React 19 SPA, Tailwind CSS v4, Lucide Icons, Vite
- **Deployment**: Universal Docker container, Render Blueprint (`render.yaml`), Vercel config (`vercel.json`), Cloudflare Public Tunnel

---

## 🧱 Database Schema

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
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
  UNIQUE(organization_id, sku) -- Enforces per-tenant SKU uniqueness
);

CREATE TABLE stock_adjustments (
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
```

---

## 💻 Local Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Start Production Server
```bash
npm start
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🧪 Automated End-to-End Verification

To run the automated test suite testing auth, tenant isolation, CRUD, stock adjustment, dashboard metrics, and settings:

```bash
# In one terminal:
node server/index.js

# In another terminal:
node tests/test_api.js
```
