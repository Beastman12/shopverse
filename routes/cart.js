'use strict';

const express = require('express');
const { db } = require('../db');
const { cartOwnerKey } = require('../lib/auth');
const { cartTotals, FREE_SHIPPING_THRESHOLD } = require('../lib/totals');
const { asyncRoute, HttpError, toInt } = require('../lib/http');

const router = express.Router();

function getCart(ownerKey) {
  const rows = db
    .prepare(
      `SELECT ci.product_id, ci.qty, p.slug, p.title, p.brand, p.price, p.list_price,
              p.stock, p.image, p.prime, p.badge, c.name AS category
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         JOIN categories c ON c.id = p.category_id
        WHERE ci.owner_key = ?
        ORDER BY ci.added_at ASC, ci.id ASC`
    )
    .all(ownerKey);

  const items = rows.map((row) => ({
    productId: row.product_id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    category: row.category,
    price: row.price,
    listPrice: row.list_price,
    stock: row.stock,
    image: row.image || `/img/p/${row.slug}.svg`,
    prime: Boolean(row.prime),
    badge: row.badge,
    qty: row.qty,
    lineTotal: row.price * row.qty,
  }));

  const totals = cartTotals(items);
  return {
    items,
    count: items.reduce((sum, item) => sum + item.qty, 0),
    ...totals,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    qualifiesForFreeShipping: totals.subtotal >= FREE_SHIPPING_THRESHOLD,
  };
}

router.get(
  '/cart',
  asyncRoute(async (req, res) => {
    const ownerKey = cartOwnerKey(req, res);
    res.json({ cart: getCart(ownerKey) });
  })
);

router.post(
  '/cart',
  asyncRoute(async (req, res) => {
    const ownerKey = cartOwnerKey(req, res);
    const productId = Number(req.body.productId);
    const qty = toInt(req.body.qty, 1, { min: 1, max: 99 });

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new HttpError(400, 'A valid product is required.');
    }

    const product = db.prepare('SELECT id, title, stock FROM products WHERE id = ?').get(productId);
    if (!product) throw new HttpError(404, 'Product not found.');
    if (product.stock < 1) throw new HttpError(409, 'This product is currently out of stock.');

    const existing = db
      .prepare('SELECT qty FROM cart_items WHERE owner_key = ? AND product_id = ?')
      .get(ownerKey, productId);
    const desired = Math.min((existing?.qty || 0) + qty, product.stock, 99);

    db.prepare(
      `INSERT INTO cart_items (owner_key, product_id, qty)
       VALUES (?, ?, ?)
       ON CONFLICT (owner_key, product_id)
       DO UPDATE SET qty = excluded.qty`
    ).run(ownerKey, productId, desired);

    const cart = getCart(ownerKey);
    res.status(201).json({
      message:
        desired < (existing?.qty || 0) + qty
          ? `Only ${product.stock} left — we added the maximum available.`
          : `${product.title} added to your cart.`,
      cart,
    });
  })
);

router.patch(
  '/cart/:productId',
  asyncRoute(async (req, res) => {
    const ownerKey = cartOwnerKey(req, res);
    const productId = Number(req.params.productId);
    const qty = toInt(req.body.qty, 1, { min: 0, max: 99 });

    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    if (!product) throw new HttpError(404, 'Product not found.');

    if (qty <= 0) {
      db.prepare('DELETE FROM cart_items WHERE owner_key = ? AND product_id = ?').run(
        ownerKey,
        productId
      );
    } else {
      if (product.stock < 1) throw new HttpError(409, 'This product is currently out of stock.');
      db.prepare(
        `UPDATE cart_items SET qty = ?
          WHERE owner_key = ? AND product_id = ?`
      ).run(Math.min(qty, product.stock, 99), ownerKey, productId);
    }

    res.json({ cart: getCart(ownerKey) });
  })
);

router.delete(
  '/cart/:productId',
  asyncRoute(async (req, res) => {
    const ownerKey = cartOwnerKey(req, res);
    const productId = Number(req.params.productId);
    db.prepare('DELETE FROM cart_items WHERE owner_key = ? AND product_id = ?').run(
      ownerKey,
      productId
    );
    res.json({ cart: getCart(ownerKey) });
  })
);

router.delete(
  '/cart',
  asyncRoute(async (req, res) => {
    const ownerKey = cartOwnerKey(req, res);
    db.prepare('DELETE FROM cart_items WHERE owner_key = ?').run(ownerKey);
    res.json({ cart: getCart(ownerKey) });
  })
);

module.exports = { router, getCart };
