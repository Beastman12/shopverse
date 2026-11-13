'use strict';

const express = require('express');
const { db } = require('../db');
const { asyncRoute, HttpError, toInt, toCents, cleanText } = require('../lib/http');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const PRODUCT_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
`;

const SORTS = {
  featured: 'p.featured DESC, p.rating_count DESC, p.id ASC',
  relevance: 'p.rating_count DESC, p.rating DESC',
  'price-asc': 'p.price ASC, p.id ASC',
  'price-desc': 'p.price DESC, p.id ASC',
  rating: 'p.rating DESC, p.rating_count DESC',
  newest: 'p.created_at DESC, p.id DESC',
};

function mapProduct(row) {
  let features = [];
  try {
    features = JSON.parse(row.features || '[]');
  } catch {
    features = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    description: row.description,
    price: row.price,
    listPrice: row.list_price,
    discount: row.list_price > row.price ? Math.round((1 - row.price / row.list_price) * 100) : 0,
    rating: row.rating,
    ratingCount: row.rating_count,
    stock: row.stock,
    badge: row.badge,
    prime: Boolean(row.prime),
    deal: Boolean(row.deal),
    featured: Boolean(row.featured),
    features,
    image: row.image || `/img/p/${row.slug}.svg`,
    category: { slug: row.category_slug, name: row.category_name },
    createdAt: row.created_at,
  };
}

function buildFilters(query) {
  const clauses = [];
  const params = [];

  const q = cleanText(query.q, 100);
  if (q) {
    const like = `%${q}%`;
    clauses.push('(p.title LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)');
    params.push(like, like, like);
  }

  const category = cleanText(query.category, 60);
  if (category) {
    clauses.push('c.slug = ?');
    params.push(category);
  }

  const minPrice = toCents(query.minPrice);
  if (minPrice !== null) {
    clauses.push('p.price >= ?');
    params.push(minPrice);
  }

  const maxPrice = toCents(query.maxPrice);
  if (maxPrice !== null) {
    clauses.push('p.price <= ?');
    params.push(maxPrice);
  }

  const rating = Number(query.rating);
  if (Number.isFinite(rating) && rating > 0) {
    clauses.push('p.rating >= ?');
    params.push(Math.min(rating, 5));
  }

  if (query.prime === '1' || query.prime === 'true') {
    clauses.push('p.prime = 1');
  }
  if (query.deal === '1' || query.deal === 'true') {
    clauses.push('p.deal = 1');
  }
  if (query.inStock === '1' || query.inStock === 'true') {
    clauses.push('p.stock > 0');
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function listProducts(whereSql, orderSql, limit) {
  return db
    .prepare(`${PRODUCT_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT ?`)
    .all(limit)
    .map(mapProduct);
}

/* --------------------------------- Routes --------------------------------- */

router.get('/categories', (req, res) => {
  const categories = db
    .prepare(
      `SELECT c.id, c.slug, c.name, c.blurb, COUNT(p.id) AS product_count,
              MIN(p.price) AS from_price
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.id`
    )
    .all();
  res.json({ categories });
});

router.get('/home', (req, res) => {
  res.json({
    categories: db
      .prepare(
        `SELECT c.id, c.slug, c.name, c.blurb, COUNT(p.id) AS product_count
           FROM categories c
           LEFT JOIN products p ON p.category_id = c.id
          GROUP BY c.id
          ORDER BY c.id`
      )
      .all(),
    deals: listProducts('WHERE p.deal = 1', 'p.rating_count DESC', 10),
    featured: listProducts('WHERE p.featured = 1', 'p.rating_count DESC', 8),
    topRated: listProducts('WHERE p.stock > 0', 'p.rating DESC, p.rating_count DESC', 10),
    newArrivals: listProducts('', 'p.id DESC', 6),
  });
});

router.get('/products', (req, res) => {
  const page = toInt(req.query.page, 1, { min: 1, max: 10000 });
  const limit = toInt(req.query.limit, 12, { min: 1, max: 48 });
  const sort = SORTS[req.query.sort] ? req.query.sort : 'featured';
  const { clause, params } = buildFilters(req.query);

  const total = db
    .prepare(
      `SELECT COUNT(*) AS count
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ${clause}`
    )
    .get(...params).count;

  const rows = db
    .prepare(
      `${PRODUCT_SELECT} ${clause}
        ORDER BY ${SORTS[sort]}
        LIMIT ? OFFSET ?`
    )
    .all(...params, limit, (page - 1) * limit);

  const priceRange = db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products').get();

  res.json({
    products: rows.map(mapProduct),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
    sort,
    priceRange: { min: priceRange.min || 0, max: priceRange.max || 0 },
  });
});

router.get('/products/:idOrSlug', (req, res, next) => {
  try {
    const key = req.params.idOrSlug;
    const row = /^\d+$/.test(key)
      ? db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(Number(key))
      : db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ?`).get(key);

    if (!row) throw new HttpError(404, 'Product not found.');

    const reviewRows = db
      .prepare(
        `SELECT r.id, r.rating, r.title, r.body, r.created_at, u.name AS author
           FROM reviews r
           JOIN users u ON u.id = r.user_id
          WHERE r.product_id = ?
          ORDER BY r.created_at DESC
          LIMIT 8`
      )
      .all(row.id);

    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const distribution = db
      .prepare('SELECT rating, COUNT(*) AS count FROM reviews WHERE product_id = ? GROUP BY rating')
      .all(row.id);
    for (const bucket of distribution) histogram[bucket.rating] = bucket.count;
    const reviewCount = Object.values(histogram).reduce((sum, value) => sum + value, 0);

    const related = db
      .prepare(
        `${PRODUCT_SELECT}
          WHERE p.category_id = ? AND p.id != ?
          ORDER BY p.rating_count DESC
          LIMIT 6`
      )
      .all(row.category_id, row.id);

    res.json({
      product: mapProduct(row),
      reviews: {
        items: reviewRows.map((review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          author: review.author,
          createdAt: review.created_at,
        })),
        histogram,
        reviewCount,
      },
      related: related.map(mapProduct),
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/products/:id/reviews',
  requireAuth,
  asyncRoute(async (req, res) => {
    const productId = Number(req.params.id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) throw new HttpError(404, 'Product not found.');

    const rating = toInt(req.body.rating, 0, { min: 0, max: 5 });
    if (rating < 1 || rating > 5) throw new HttpError(400, 'Choose a rating from 1 to 5 stars.');

    const title = cleanText(req.body.title, 120);
    const body = cleanText(req.body.body, 2000);
    if (!title) throw new HttpError(400, 'Add a short review title.');
    if (body.length < 10) throw new HttpError(400, 'Your review needs at least 10 characters.');

    const existing = db
      .prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?')
      .get(productId, req.user.id);
    if (existing) throw new HttpError(409, 'You have already reviewed this product.');

    db.prepare(
      'INSERT INTO reviews (product_id, user_id, rating, title, body) VALUES (?, ?, ?, ?, ?)'
    ).run(productId, req.user.id, rating, title, body);

    // Blend the new rating into the stored aggregate so seeded rating counts
    // stay realistic while still reflecting new customer feedback.
    const nextCount = product.rating_count + 1;
    const nextRating =
      Math.round(((product.rating * product.rating_count + rating) / nextCount) * 10) / 10;
    db.prepare('UPDATE products SET rating = ?, rating_count = ? WHERE id = ?').run(
      nextRating,
      nextCount,
      productId
    );

    res.status(201).json({
      message: 'Thanks — your review has been published.',
      review: {
        id: Number(db.prepare('SELECT last_insert_rowid() AS id').get().id),
        rating,
        title,
        body,
        author: req.user.name,
      },
      rating: nextRating,
      ratingCount: nextCount,
    });
  })
);

module.exports = { router, mapProduct, PRODUCT_SELECT };
