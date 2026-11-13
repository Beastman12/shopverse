# ShopVerse

**ShopVerse** is a full-stack, Amazon-style e-commerce store built with Node.js, Express and SQLite. It ships with a complete storefront, user accounts, a guest-friendly cart, checkout and order management, plus an admin dashboard — and it runs with **zero build steps** and **no native dependencies**.

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.5-3c873a)
![Express](https://img.shields.io/badge/Express-4.x-000000)
![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Highlights

- **Storefront** — carousel hero, 8 departments, today's deals, featured picks, top-rated and new-arrival rails, promoted collections, and a rich product grid.
- **Search & browse** — keyword search, category filters, price range, rating, Prime and deal filters, six sort orders, pagination and removable filter chips.
- **Product pages** — generated SVG gallery with multiple variants, live price/discount, stock, rating summary, review list, verified-purchase badge, related products and Buy Now.
- **Cart** — works for guests and signed-in users; quantities, remove, free-shipping progress bar, totals with tax and shipping.
- **Accounts** — register/login/logout with scrypt password hashing and database-backed HttpOnly session cookies. Guest carts merge into the account cart on login.
- **Checkout & orders** — address and payment form (demo validation), order placement in a transaction, order history with status filters, order detail timeline, and cancellation of processing orders.
- **Admin dashboard** — revenue/order/product stats, product create/edit/delete, order list with status filters, and order status updates (`Processing → Shipped → Delivered`).
- **Product artwork** — every product, category and avatar image is a dynamically generated SVG served from the API. No binary assets to manage.
- **Demo data** — 56 products across 8 categories, 26 reviews and 4 seeded orders.

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Runtime    | Node.js ≥ 22.5 (uses the built-in `node:sqlite` driver)        |
| Server     | Express 4 with custom security headers                         |
| Database   | SQLite via `node:sqlite` (file-backed, WAL mode)               |
| Auth       | `node:crypto` scrypt hashes + DB-backed session tokens         |
| Frontend   | Vanilla HTML/CSS/JavaScript, no framework and no build step    |
| Images     | SVG generated on the fly in `lib/art.js`                       |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create the database and load the demo catalog
npm run seed

# 3. Start the server
npm start
```

Open <http://localhost:3000>.

> **Node version:** `node:sqlite` is available from Node 22.5 onward. The repo is tested on Node 26. Node 22/24 print an experimental warning for `node:sqlite`; it is safe to ignore for this project.

### Demo accounts

| Role     | Email                  | Password   |
| -------- | ---------------------- | ---------- |
| Customer | `demo@shopverse.dev`   | `Demo123!` |
| Admin    | `admin@shopverse.dev`  | `Admin123!`|

The admin dashboard lives at `/admin` and is only available to the admin account.

## Scripts

| Command          | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `npm start`      | Start the server on port 3000                             |
| `npm run dev`    | Start with `--watch` for auto-restart on file changes     |
| `npm run seed`   | Create tables and load the demo catalog (idempotent)       |
| `npm run reset`  | Delete the database and rebuild it from scratch            |
| `npm run smoke`  | Run the 18-check API smoke test (server must be running)   |

## Configuration

Copy `.env.example` to `.env` if you want to override the defaults:

```ini
PORT=3000
NODE_ENV=development
SESSION_SECRET=change-me-to-a-long-random-string
# DB_PATH=./data/store.db
```

| Variable         | Default          | Purpose                                  |
| ---------------- | ---------------- | ---------------------------------------- |
| `PORT`           | `3000`           | HTTP port                                |
| `NODE_ENV`       | `development`    | Use `production` to mark cookies `Secure` |
| `SESSION_SECRET` | dev fallback     | Secret used to sign the session cookie   |
| `DB_PATH`        | `data/store.db`  | SQLite database location                 |

## Project structure

```text
shopverse/
├─ server.js                 # Express app, page routes, SVG routes, error handling
├─ db/
│  ├─ index.js               # SQLite connection, schema and helpers
│  ├─ catalog.js             # 56-product demo catalog (categories, reviews, orders)
│  ├─ seed.js                # Idempotent seeding
│  └─ reset.js               # Drop + reseed
├─ lib/
│  ├─ art.js                 # SVG product/category/avatar generators
│  ├─ auth.js                # Password hashing, session helpers, guards
│  ├─ http.js                # HttpError, asyncRoute, validators
│  └─ totals.js              # Cart totals (shipping + tax rules)
├─ routes/
│  ├─ products.js            # Home, categories, search, product detail, reviews
│  ├─ cart.js                # Guest + user cart endpoints
│  ├─ auth.js                # Register, login, logout, me
│  ├─ orders.js              # Checkout, history, detail, cancel
│  └─ admin.js               # Stats, product CRUD, order management
├─ public/
│  ├─ *.html                 # 11 pages (storefront, auth, orders, admin, 404)
│  ├─ css/styles.css         # Complete responsive design system
│  └─ js/                    # Page controllers + shared api.js/layout.js
├─ scripts/smoke-test.js     # End-to-end API checks
└─ data/store.db             # Created at runtime (git-ignored)
```

## Pages

| Route              | Page                                              |
| ------------------ | ------------------------------------------------- |
| `/`                | Home — hero carousel and curated product rails    |
| `/search`          | Search results with filters, sort and pagination  |
| `/p/:slug`         | Product detail, reviews and related products      |
| `/cart`            | Cart and totals                                   |
| `/checkout`        | Address/payment form and order placement          |
| `/orders`          | Order history with status filters                 |
| `/order/:number`   | Order detail and timeline                         |
| `/login`, `/register` | Account forms                                   |
| `/admin`           | Admin dashboard (admin only)                      |

## API overview

All responses are JSON. Sessions travel in the `sv_session` HttpOnly cookie; guests get an `sv_guest` cookie so their cart survives the session.

### Catalog

| Method | Endpoint                        | Description                                    |
| ------ | ------------------------------- | ---------------------------------------------- |
| `GET`  | `/api/health`                   | Health probe with product count                |
| `GET`  | `/api/home`                     | Hero slides, categories, deals, rails          |
| `GET`  | `/api/categories`               | Departments with product counts                |
| `GET`  | `/api/products`                 | Search/filter/sort/paginate products           |
| `GET`  | `/api/products/:idOrSlug`       | Product detail, reviews and related products   |
| `POST` | `/api/products/:id/reviews`     | Add a review (signed in, one per product)      |

`GET /api/products` query parameters: `q`, `category`, `min`, `max`, `rating`, `prime`, `deal`, `sort` (`featured`, `price-asc`, `price-desc`, `rating`, `newest`, `discount`), `page`, `limit`.

### Cart

| Method   | Endpoint                | Description                     |
| -------- | ----------------------- | ------------------------------- |
| `GET`    | `/api/cart`             | Cart with totals                |
| `POST`   | `/api/cart`             | Add `{ productId, qty }`        |
| `PATCH`  | `/api/cart/:productId`  | Set quantity `{ qty }`          |
| `DELETE` | `/api/cart/:productId`  | Remove one line                 |
| `DELETE` | `/api/cart`             | Clear the cart                  |

### Auth

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| `POST` | `/api/auth/register` | Create an account (merges guest cart) |
| `POST` | `/api/auth/login`    | Sign in (merges guest cart)           |
| `POST` | `/api/auth/logout`   | Destroy the session                   |
| `GET`  | `/api/auth/me`       | Current user or `null`                |

### Orders

| Method | Endpoint                       | Description                        |
| ------ | ------------------------------ | ---------------------------------- |
| `POST` | `/api/orders`                  | Place an order from the cart       |
| `GET`  | `/api/orders`                  | Order history (`?status=`)         |
| `GET`  | `/api/orders/:number`          | Order detail                       |
| `POST` | `/api/orders/:number/cancel`   | Cancel a processing order          |

### Admin (admin role required)

| Method   | Endpoint                    | Description                    |
| -------- | --------------------------- | ------------------------------ |
| `GET`    | `/api/admin/stats`          | Revenue, orders, products, stock |
| `GET`    | `/api/admin/products`       | Product list for editing       |
| `POST`   | `/api/admin/products`       | Create a product               |
| `PUT`    | `/api/admin/products/:id`   | Update a product               |
| `DELETE` | `/api/admin/products/:id`   | Delete a product               |
| `GET`    | `/api/admin/orders`         | Orders (`?status=`)            |
| `PATCH`  | `/api/admin/orders/:id`     | Update order status            |

## How it works

### Money

Prices are stored as **integer cents** everywhere (API and database) to avoid floating-point drift. The UI formats them as `$16.99`. Cart math lives in `lib/totals.js`:

- Shipping is **free** on orders of **$35 or more**, otherwise **$5.99**.
- Tax is a flat demo rate of **8.25%**.
- Totals are recomputed server-side on every cart response and again at checkout.

### Auth & sessions

Passwords are hashed with `scrypt` and a per-user random salt. Sessions are random 32-byte tokens stored in the `sessions` table with an expiry, delivered as an HttpOnly, SameSite=Lax cookie (`Secure` in production). No JWT secrets to leak, and logout is a real server-side invalidation.

### Guest carts

A guest receives an `sv_guest` cookie containing a random owner key. Cart rows are keyed by that owner. On login or registration the guest cart is merged into the user cart inside a transaction, so nothing is lost.

### Orders

Checkout validates stock and quantities, recomputes totals on the server, creates the order and its line items in a single transaction, decrements stock, and clears the cart. Each order gets a human-friendly number such as `SV-6F2A1B`.

### Generated artwork

`lib/art.js` renders deterministic SVGs for products (`/img/p/:slug.svg?v=0..3`), categories (`/img/c/:slug.svg`) and avatars. Each product image is composed from its category palette and title, so a 56-product catalog needs no image files.

## Security notes

- scrypt password hashing with timing-safe comparison.
- DB-backed HttpOnly session cookies; no credentials in `localStorage`.
- Role checks on every admin route, not just in the UI.
- Parameterized SQL everywhere.
- Request body size limits, input length/type validation and login throttling.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

## Deployment

Any host that runs Node ≥ 22.5 and gives you a persistent disk works (Render, Railway, Fly.io, a VPS). Set `NODE_ENV=production`, a strong `SESSION_SECRET`, and make sure `data/` is on persistent storage. Start with `npm start` after `npm run seed`.

This project is a portfolio/demo build: payment is simulated, and tax/shipping rules are illustrative rather than production tax logic.

## License

[MIT](LICENSE) © Niranjan Gupta
