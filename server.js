'use strict';

const path = require('node:path');
const express = require('express');

const { db } = require('./db');
const { attachIdentity } = require('./lib/auth');
const { renderProductImage, renderCategoryImage } = require('./lib/art');
const { HttpError } = require('./lib/http');

const app = express();
const publicDir = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.set('trust proxy', 1);

/* ------------------------------ Middleware ------------------------------- */

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '200kb' }));
app.use(attachIdentity);

/* ---------------------------------- API ---------------------------------- */

app.use('/api/auth', require('./routes/auth').router);
app.use('/api', require('./routes/products').router);
app.use('/api', require('./routes/cart').router);
app.use('/api', require('./routes/orders').router);
app.use('/api/admin', require('./routes/admin').router);

app.get('/api/health', (req, res) => {
  const products = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  res.json({ status: 'ok', products, uptime: Math.round(process.uptime()) });
});

/* ----------------------------- Generated art ----------------------------- */

app.get('/img/p/:file', (req, res) => {
  const slug = String(req.params.file).replace(/\.svg$/i, '');
  const product = db
    .prepare(
      `SELECT p.slug, p.title, p.brand, c.slug AS category_slug
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.slug = ?`
    )
    .get(slug);

  if (!product) {
    res.status(404).type('text/plain').send('Image not found');
    return;
  }

  const variant = Math.min(Math.max(Number.parseInt(req.query.v, 10) || 0, 0), 3);
  res
    .type('image/svg+xml')
    .set('Cache-Control', 'public, max-age=86400')
    .send(renderProductImage(product, variant));
});

app.get('/img/c/:file', (req, res) => {
  const slug = String(req.params.file).replace(/\.svg$/i, '');
  const category = db
    .prepare('SELECT slug, name FROM categories WHERE slug = ?')
    .get(slug);
  if (!category) {
    res.status(404).type('text/plain').send('Image not found');
    return;
  }
  res
    .type('image/svg+xml')
    .set('Cache-Control', 'public, max-age=86400')
    .send(renderCategoryImage(category));
});

/* -------------------------------- Pages ---------------------------------- */

const page = (file) => (req, res) => res.sendFile(path.join(publicDir, file));

app.get('/p/:slug', page('product.html'));
app.get('/search', page('search.html'));
app.get('/cart', page('cart.html'));
app.get('/checkout', page('checkout.html'));
app.get('/orders', page('orders.html'));
app.get('/order/:number', page('order.html'));
app.get('/login', page('login.html'));
app.get('/register', page('register.html'));
app.get('/admin', page('admin.html'));

app.use(
  express.static(publicDir, {
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (/\.(html|css|js)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

/* ------------------------------- Fallbacks -------------------------------- */

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

/* ---------------------------- Error handling ------------------------------ */

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  if (String(error.code || '').startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'That action conflicts with existing data.' });
  }

  console.error('[shopverse]', error);
  return res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});

/* --------------------------------- Start ---------------------------------- */

const port = Number(process.env.PORT) || 3000;

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;

const server = app.listen(port, () => {
  console.log('');
  console.log('  ShopVerse is running');
  console.log(`  → http://localhost:${port}`);
  console.log('');
  if (productCount === 0) {
    console.log('  The database is empty. Run "npm run seed" to load the demo catalog.');
  } else {
    console.log(`  ${productCount} products ready · admin@shopverse.dev / Admin123!`);
  }
  console.log('');
});

function shutdown() {
  server.close(() => {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
