'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dataDir, 'store.db');

const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    slug  TEXT    NOT NULL UNIQUE,
    name  TEXT    NOT NULL,
    icon  TEXT    NOT NULL DEFAULT 'box',
    blurb TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT    NOT NULL UNIQUE,
    title        TEXT    NOT NULL,
    brand        TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    category_id  INTEGER NOT NULL REFERENCES categories(id),
    price        INTEGER NOT NULL CHECK (price >= 0),
    list_price   INTEGER NOT NULL CHECK (list_price >= price),
    rating       REAL    NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    stock        INTEGER NOT NULL DEFAULT 0,
    badge        TEXT,
    prime        INTEGER NOT NULL DEFAULT 0,
    deal         INTEGER NOT NULL DEFAULT 0,
    featured     INTEGER NOT NULL DEFAULT 0,
    features     TEXT    NOT NULL DEFAULT '[]',
    image        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

  CREATE TABLE IF NOT EXISTS cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_key  TEXT    NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty        INTEGER NOT NULL CHECK (qty > 0 AND qty <= 99),
    added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (owner_key, product_id)
  );
  CREATE INDEX IF NOT EXISTS idx_cart_owner ON cart_items(owner_key);

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number   TEXT    NOT NULL UNIQUE,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status         TEXT    NOT NULL DEFAULT 'Processing'
                   CHECK (status IN ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
    subtotal       INTEGER NOT NULL,
    shipping       INTEGER NOT NULL,
    tax            INTEGER NOT NULL,
    total          INTEGER NOT NULL,
    payment_method TEXT    NOT NULL,
    full_name      TEXT    NOT NULL,
    email          TEXT    NOT NULL,
    address        TEXT    NOT NULL,
    city           TEXT    NOT NULL,
    state          TEXT    NOT NULL,
    zip            TEXT    NOT NULL,
    country        TEXT    NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    title      TEXT    NOT NULL,
    brand      TEXT    NOT NULL,
    image      TEXT,
    price      INTEGER NOT NULL,
    qty        INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title      TEXT    NOT NULL DEFAULT '',
    body       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
`);

/** Run a function inside a SQLite transaction, rolling back on error. */
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* ignore rollback failures */
    }
    throw error;
  }
}

module.exports = { db, dbPath, transaction };
