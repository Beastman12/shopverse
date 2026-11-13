'use strict';

const { db, transaction } = require('./index');
const { hashPassword } = require('../lib/auth');
const { cartTotals: totalsFor } = require('../lib/totals');
const catalog = require('./catalog');

async function seed({ force = false } = {}) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM products').get();
  if (existing.count > 0 && !force) {
    console.log(`Database already contains ${existing.count} products — skipping seed.`);
    console.log('Run "npm run reset" to rebuild the demo data.');
    return;
  }

  const categoryIds = new Map();
  const productIds = new Map();
  const userIds = new Map();

  // Password hashing is async, so prepare users before the transaction.
  const userRecords = [];
  for (const user of catalog.customers) {
    userRecords.push({ ...user, passwordHash: await hashPassword(user.password) });
  }

  transaction(() => {
    // Clean slate (respect foreign keys).
    for (const table of ['reviews', 'order_items', 'orders', 'cart_items', 'sessions', 'products', 'categories', 'users']) {
      db.exec(`DELETE FROM ${table}`);
    }
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','categories','products','cart_items','orders','order_items','reviews','sessions')");

    const insertCategory = db.prepare(
      'INSERT INTO categories (slug, name, icon, blurb) VALUES (?, ?, ?, ?)'
    );
    for (const category of catalog.categories) {
      const result = insertCategory.run(category.slug, category.name, category.slug, category.blurb);
      categoryIds.set(category.slug, Number(result.lastInsertRowid));
    }

    const insertProduct = db.prepare(
      `INSERT INTO products
        (slug, title, brand, description, category_id, price, list_price, rating,
         rating_count, stock, badge, prime, deal, featured, features, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const product of catalog.products) {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new Error(`Unknown category: ${product.category}`);
      const result = insertProduct.run(
        product.slug,
        product.title,
        product.brand,
        product.description,
        categoryId,
        Math.round(product.price * 100),
        Math.round(product.listPrice * 100),
        product.rating,
        product.ratingCount,
        product.stock,
        product.badge,
        product.prime ? 1 : 0,
        product.deal ? 1 : 0,
        product.featured ? 1 : 0,
        JSON.stringify(product.features || []),
        `/img/p/${product.slug}.svg`
      );
      productIds.set(product.slug, Number(result.lastInsertRowid));
    }

    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    for (const user of userRecords) {
      const result = insertUser.run(user.name, user.email, user.passwordHash, user.role);
      userIds.set(user.email, Number(result.lastInsertRowid));
    }

    const insertReview = db.prepare(
      `INSERT INTO reviews (product_id, user_id, rating, title, body, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', ?))`
    );
    for (const review of catalog.reviews) {
      const productId = productIds.get(review.product);
      const userId = userIds.get(review.email);
      if (!productId || !userId) continue;
      insertReview.run(
        productId,
        userId,
        review.rating,
        review.title,
        review.body,
        `-${review.daysAgo} days`
      );
    }

    const insertOrder = db.prepare(
      `INSERT INTO orders
        (order_number, user_id, status, subtotal, shipping, tax, total, payment_method,
         full_name, email, address, city, state, zip, country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
    );
    const insertOrderItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, title, brand, image, price, qty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const address = {
      fullName: 'Demo Shopper',
      address: '14 Marine Drive, Flat 5B',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400020',
      country: 'India',
    };

    catalog.orders.forEach((order, index) => {
      const items = order.items
        .map((item) => {
          const product = catalog.products.find((p) => p.slug === item.product);
          if (!product) return null;
          return {
            product,
            id: productIds.get(product.slug),
            price: Math.round(product.price * 100),
            qty: item.qty,
          };
        })
        .filter(Boolean);

      const totals = totalsFor(items.map((item) => ({ price: item.price, qty: item.qty })));
      const userId = userIds.get(order.email);
      const result = insertOrder.run(
        `SV-${100001 + index}`,
        userId,
        order.status,
        totals.subtotal,
        totals.shipping,
        totals.tax,
        totals.total,
        order.payment,
        order.email === 'demo@shopverse.dev' ? address.fullName : 'Maya Patel',
        order.email,
        address.address,
        address.city,
        address.state,
        address.zip,
        address.country,
        `-${order.daysAgo} days`
      );
      const orderId = Number(result.lastInsertRowid);
      for (const item of items) {
        insertOrderItem.run(
          orderId,
          item.id,
          item.product.title,
          item.product.brand,
          `/img/p/${item.product.slug}.svg`,
          item.price,
          item.qty
        );
      }
    });
  });

  console.log('ShopVerse demo data seeded successfully.');
  console.log(`  Categories: ${catalog.categories.length}`);
  console.log(`  Products:   ${catalog.products.length}`);
  console.log(`  Reviews:    ${catalog.reviews.length}`);
  console.log(`  Orders:     ${catalog.orders.length}`);
  console.log('');
  console.log('Demo accounts:');
  console.log('  Customer: demo@shopverse.dev / Demo123!');
  console.log('  Admin:    admin@shopverse.dev / Admin123!');
}

if (require.main === module) {
  seed({ force: process.argv.includes('--force') })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seed, totalsFor };
