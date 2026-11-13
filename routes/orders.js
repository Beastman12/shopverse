'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { db, transaction } = require('../db');
const { requireAuth } = require('../lib/auth');
const { asyncRoute, HttpError, cleanText, isEmail } = require('../lib/http');
const { cartTotals } = require('../lib/totals');
const { getCart } = require('./cart');

const router = express.Router();

const PAYMENT_METHODS = {
  card: 'Card ending 4242',
  upi: 'UPI',
  cod: 'Cash on delivery',
};

function serializeOrder(order, items) {
  return {
    id: order.id,
    number: order.order_number,
    status: order.status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    paymentMethod: order.payment_method,
    createdAt: order.created_at,
    address: {
      fullName: order.full_name,
      email: order.email,
      address: order.address,
      city: order.city,
      state: order.state,
      zip: order.zip,
      country: order.country,
    },
    items: items.map((item) => ({
      productId: item.product_id,
      slug: item.slug || null,
      title: item.title,
      brand: item.brand,
      image: item.image || '/img/p/placeholder.svg',
      price: item.price,
      qty: item.qty,
      lineTotal: item.price * item.qty,
    })),
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
  };
}

function orderItems(orderId) {
  return db
    .prepare(
      `SELECT oi.*, p.slug
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.id`
    )
    .all(orderId);
}

function loadOrder(whereSql, param) {
  const order = db
    .prepare(`SELECT * FROM orders ${whereSql}`)
    .get(param);
  if (!order) return null;
  return serializeOrder(order, orderItems(order.id));
}

function generateOrderNumber() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `SV-${crypto.randomInt(100000, 999999)}`;
    const exists = db
      .prepare('SELECT 1 AS found FROM orders WHERE order_number = ?')
      .get(candidate);
    if (!exists) return candidate;
  }
  throw new HttpError(500, 'Could not create an order number. Please try again.');
}

function readShipping(body) {
  const source = body && typeof body.shipping === 'object' && body.shipping ? body.shipping : body;

  const fullName = cleanText(source.fullName, 80);
  const email = cleanText(source.email, 160).toLowerCase();
  const address = cleanText(source.address, 160);
  const city = cleanText(source.city, 80);
  const state = cleanText(source.state, 80);
  const zip = cleanText(source.zip, 20);
  const country = cleanText(source.country, 80);

  if (fullName.length < 2) throw new HttpError(400, 'Please enter the recipient’s full name.');
  if (!isEmail(email)) throw new HttpError(400, 'Please enter a valid email for order updates.');
  if (address.length < 5) throw new HttpError(400, 'Please enter a complete street address.');
  if (city.length < 2) throw new HttpError(400, 'Please enter a city.');
  if (state.length < 2) throw new HttpError(400, 'Please enter a state or region.');
  if (!/^[A-Za-z0-9 -]{3,20}$/.test(zip)) throw new HttpError(400, 'Please enter a valid postal code.');
  if (country.length < 2) throw new HttpError(400, 'Please enter a country.');

  return { fullName, email, address, city, state, zip, country };
}

/* --------------------------------- Routes --------------------------------- */

router.post(
  '/orders',
  requireAuth,
  asyncRoute(async (req, res) => {
    const shipping = readShipping(req.body);
    const paymentKey = cleanText(req.body.paymentMethod, 20).toLowerCase();
    const paymentMethod = PAYMENT_METHODS[paymentKey];
    if (!paymentMethod) throw new HttpError(400, 'Choose a valid payment method.');

    const cart = getCart(`u:${req.user.id}`);
    if (cart.items.length === 0) throw new HttpError(400, 'Your cart is empty.');

    const stockRows = db
      .prepare(
        `SELECT p.id, p.title, p.stock
           FROM products p
           JOIN cart_items ci ON ci.product_id = p.id
          WHERE ci.owner_key = ?`
      )
      .all(`u:${req.user.id}`);

    const stockById = new Map(stockRows.map((row) => [row.id, row]));
    for (const item of cart.items) {
      const product = stockById.get(item.productId);
      if (!product || product.stock < item.qty) {
        throw new HttpError(
          409,
          product
            ? `Only ${product.stock} × ${product.title} left in stock. Update your cart to continue.`
            : 'One of the items in your cart is no longer available.'
        );
      }
    }

    const orderNumber = generateOrderNumber();
    const totals = cartTotals(cart.items);

    const order = transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO orders
            (order_number, user_id, status, subtotal, shipping, tax, total, payment_method,
             full_name, email, address, city, state, zip, country)
           VALUES (?, ?, 'Processing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          orderNumber,
          req.user.id,
          totals.subtotal,
          totals.shipping,
          totals.tax,
          totals.total,
          paymentMethod,
          shipping.fullName,
          shipping.email,
          shipping.address,
          shipping.city,
          shipping.state,
          shipping.zip,
          shipping.country
        );

      const orderId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, title, brand, image, price, qty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      const decrementStock = db.prepare(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?'
      );

      for (const item of cart.items) {
        insertItem.run(
          orderId,
          item.productId,
          item.title,
          item.brand,
          item.image,
          item.price,
          item.qty
        );
        const updated = decrementStock.run(item.qty, item.productId, item.qty);
        if (updated.changes === 0) {
          throw new HttpError(409, `${item.title} just sold out. Please update your cart.`);
        }
      }

      db.prepare('DELETE FROM cart_items WHERE owner_key = ?').run(`u:${req.user.id}`);

      const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      return serializeOrder(created, orderItems(orderId));
    });

    res.status(201).json({
      message: `Order ${order.number} placed successfully.`,
      order,
    });
  })
);

router.get(
  '/orders',
  requireAuth,
  asyncRoute(async (req, res) => {
    const orders = db
      .prepare(
        `SELECT * FROM orders
          WHERE user_id = ?
          ORDER BY datetime(created_at) DESC, id DESC`
      )
      .all(req.user.id)
      .map((order) => serializeOrder(order, orderItems(order.id)));

    res.json({ orders });
  })
);

router.get(
  '/orders/:number',
  requireAuth,
  asyncRoute(async (req, res) => {
    const order = loadOrder('WHERE order_number = ?', req.params.number);
    if (!order) throw new HttpError(404, 'Order not found.');
    const owner =
      db
        .prepare('SELECT user_id FROM orders WHERE order_number = ?')
        .get(req.params.number)?.user_id;
    if (owner !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'You do not have access to this order.');
    }
    res.json({ order });
  })
);

router.post(
  '/orders/:number/cancel',
  requireAuth,
  asyncRoute(async (req, res) => {
    const order = db
      .prepare('SELECT * FROM orders WHERE order_number = ?')
      .get(req.params.number);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'You do not have access to this order.');
    }
    if (order.status !== 'Processing') {
      throw new HttpError(409, 'This order can no longer be cancelled — it has already been shipped.');
    }

    transaction(() => {
      const items = db
        .prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?')
        .all(order.id);
      const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) restock.run(item.qty, item.product_id);
      }
      db.prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ?").run(order.id);
    });

    res.json({
      message: `Order ${order.order_number} has been cancelled and your items restocked.`,
      order: loadOrder('WHERE order_number = ?', order.order_number),
    });
  })
);

module.exports = { router };
