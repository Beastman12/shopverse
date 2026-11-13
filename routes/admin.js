'use strict';

const express = require('express');
const { db, transaction } = require('../db');
const { requireAdmin } = require('../lib/auth');
const { asyncRoute, HttpError, cleanText, toInt, toCents } = require('../lib/http');
const { mapProduct, PRODUCT_SELECT } = require('./products');

const router = express.Router();

router.use(requireAdmin);

const ORDER_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product'
  );
}

function uniqueSlug(base) {
  let slug = base;
  let counter = 2;
  while (db.prepare('SELECT 1 AS found FROM products WHERE slug = ?').get(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function readProductBody(body) {
  const title = cleanText(body.title, 160);
  const brand = cleanText(body.brand, 80);
  const description = cleanText(body.description, 2000);
  const price = toCents(body.price);
  const listPrice = toCents(body.listPrice ?? body.price);
  const stock = toInt(body.stock, 0, { min: 0, max: 100000 });
  const categoryId = Number(body.categoryId);
  const badge = cleanText(body.badge, 40) || null;

  if (title.length < 3) throw new HttpError(400, 'Product title needs at least 3 characters.');
  if (brand.length < 2) throw new HttpError(400, 'Brand needs at least 2 characters.');
  if (price === null || price <= 0) throw new HttpError(400, 'Enter a valid price.');
  if (listPrice === null || listPrice < price) {
    throw new HttpError(400, 'List price must be greater than or equal to the sale price.');
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new HttpError(400, 'Choose a category.');
  }
  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!category) throw new HttpError(400, 'That category does not exist.');

  let features = [];
  if (Array.isArray(body.features)) {
    features = body.features;
  } else if (typeof body.features === 'string') {
    features = body.features.split('\n');
  }
  features = features.map((feature) => cleanText(feature, 200)).filter(Boolean).slice(0, 10);
  if (features.length === 0) features = ['Quality-tested by the ShopVerse team.'];

  return {
    title,
    brand,
    description,
    price,
    listPrice,
    stock,
    categoryId,
    badge,
    features,
    prime: Boolean(body.prime),
    deal: Boolean(body.deal),
    featured: Boolean(body.featured),
  };
}

function adminProduct(productId) {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(productId);
  return row ? mapProduct(row) : null;
}

/* --------------------------------- Routes --------------------------------- */

router.get('/stats', (req, res) => {
  const revenue = db
    .prepare("SELECT COALESCE(SUM(total), 0) AS value FROM orders WHERE status != 'Cancelled'")
    .get().value;
  const orders = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
  const customers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'").get().count;
  const products = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  const lowStock = db.prepare('SELECT COUNT(*) AS count FROM products WHERE stock <= 10').get().count;

  const recentOrders = db
    .prepare(
      `SELECT o.id, o.order_number, o.status, o.total, o.created_at, u.name AS customer
         FROM orders o
         JOIN users u ON u.id = o.user_id
        ORDER BY datetime(o.created_at) DESC, o.id DESC
        LIMIT 6`
    )
    .all();

  const topProducts = db
    .prepare(
      `SELECT oi.title, SUM(oi.qty) AS sold, SUM(oi.price * oi.qty) AS revenue
         FROM order_items oi
        GROUP BY oi.title
        ORDER BY sold DESC
        LIMIT 5`
    )
    .all();

  res.json({ stats: { revenue, orders, customers, products, lowStock, recentOrders, topProducts } });
});

router.get('/products', (req, res) => {
  const rows = db
    .prepare(`${PRODUCT_SELECT} ORDER BY p.id DESC LIMIT 500`)
    .all();
  res.json({ products: rows.map(mapProduct) });
});

router.post(
  '/products',
  asyncRoute(async (req, res) => {
    const data = readProductBody(req.body);
    const slug = uniqueSlug(slugify(data.title));
    const result = db
      .prepare(
        `INSERT INTO products
          (slug, title, brand, description, category_id, price, list_price, rating,
           rating_count, stock, badge, prime, deal, featured, features, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        slug,
        data.title,
        data.brand,
        data.description,
        data.categoryId,
        data.price,
        data.listPrice,
        data.stock,
        data.badge,
        data.prime ? 1 : 0,
        data.deal ? 1 : 0,
        data.featured ? 1 : 0,
        JSON.stringify(data.features),
        `/img/p/${slug}.svg`
      );

    res.status(201).json({
      message: `“${data.title}” added to the catalog.`,
      product: adminProduct(Number(result.lastInsertRowid)),
    });
  })
);

router.put(
  '/products/:id',
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Product not found.');

    const data = readProductBody(req.body);
    db.prepare(
      `UPDATE products
          SET title = ?, brand = ?, description = ?, category_id = ?, price = ?,
              list_price = ?, stock = ?, badge = ?, prime = ?, deal = ?, featured = ?,
              features = ?
        WHERE id = ?`
    ).run(
      data.title,
      data.brand,
      data.description,
      data.categoryId,
      data.price,
      data.listPrice,
      data.stock,
      data.badge,
      data.prime ? 1 : 0,
      data.deal ? 1 : 0,
      data.featured ? 1 : 0,
      JSON.stringify(data.features),
      id
    );

    res.json({ message: 'Product updated.', product: adminProduct(id) });
  })
);

router.delete(
  '/products/:id',
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Product not found.');

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted.' });
  })
);

router.get('/orders', (req, res) => {
  const status = cleanText(req.query.status, 20);
  const where = ORDER_STATUSES.includes(status) ? 'WHERE o.status = ?' : '';
  const params = where ? [status] : [];
  const orders = db
    .prepare(
      `SELECT o.id, o.order_number, o.status, o.subtotal, o.shipping, o.tax, o.total,
              o.payment_method, o.created_at, o.full_name, u.name AS customer, u.email,
              (SELECT COALESCE(SUM(qty), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o
         JOIN users u ON u.id = o.user_id
         ${where}
        ORDER BY datetime(o.created_at) DESC, o.id DESC
        LIMIT 200`
    )
    .all(...params);
  res.json({ orders });
});

router.patch(
  '/orders/:id',
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) throw new HttpError(404, 'Order not found.');

    const status = cleanText(req.body.status, 20);
    if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Invalid order status.');
    if (order.status === status) {
      return res.json({ message: 'Order already has that status.', order: { id, status } });
    }
    if (order.status === 'Cancelled') {
      throw new HttpError(409, 'Cancelled orders cannot be reopened.');
    }

    transaction(() => {
      if (status === 'Cancelled') {
        const items = db
          .prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?')
          .all(id);
        const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        for (const item of items) {
          if (item.product_id) restock.run(item.qty, item.product_id);
        }
      }
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    });

    res.json({
      message: `Order ${order.order_number} marked as ${status}.`,
      order: { id, status },
    });
  })
);

module.exports = { router };
