'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { db, transaction } = require('../db');
const { parseCookies } = require('./http');

const scrypt = promisify(crypto.scrypt);

const SESSION_COOKIE = 'sv_session';
const GUEST_COOKIE = 'sv_guest';
const SESSION_DAYS = 30;

const isProd = process.env.NODE_ENV === 'production';

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(expected, derived);
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES (?, ?, datetime('now', ?))`
  ).run(token, userId, `+${SESSION_DAYS} days`);
  return token;
}

function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function findSessionUser(token) {
  if (!token) return null;
  return (
    db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, s.token
           FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND s.expires_at > datetime('now')`
      )
      .get(token) || null
  );
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/* ------------------------------------------------------------------ */
/* Guest carts                                                         */
/* ------------------------------------------------------------------ */

function ensureGuestToken(req, res) {
  if (req.guestToken) return req.guestToken;
  const cookies = req.cookies || parseCookies(req.headers.cookie);
  let token = cookies[GUEST_COOKIE];
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    token = crypto.randomBytes(16).toString('hex');
    res.cookie(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
  req.guestToken = token;
  return token;
}

/** The cart bucket for the current visitor: user account or guest cookie. */
function cartOwnerKey(req, res) {
  if (req.user) return `u:${req.user.id}`;
  return `g:${ensureGuestToken(req, res)}`;
}

/** Move items from the guest cart into the user's cart after auth. */
function mergeGuestCart(guestToken, userId) {
  if (!guestToken || !/^[a-f0-9]{32}$/.test(guestToken)) return;
  const guestKey = `g:${guestToken}`;
  const userKey = `u:${userId}`;

  const rows = db
    .prepare('SELECT product_id, qty FROM cart_items WHERE owner_key = ?')
    .all(guestKey);
  if (rows.length === 0) return;

  transaction(() => {
    const upsert = db.prepare(
      `INSERT INTO cart_items (owner_key, product_id, qty)
       VALUES (?, ?, ?)
       ON CONFLICT (owner_key, product_id)
       DO UPDATE SET qty = MIN(cart_items.qty + excluded.qty, 99)`
    );
    for (const row of rows) upsert.run(userKey, row.product_id, row.qty);
    db.prepare('DELETE FROM cart_items WHERE owner_key = ?').run(guestKey);
  });
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

/** Attach req.user (may be null), req.guestToken and parsed cookies. */
function attachIdentity(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  req.user = findSessionUser(req.cookies[SESSION_COOKIE]);
  req.guestToken = req.cookies[GUEST_COOKIE] || null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
}

module.exports = {
  SESSION_COOKIE,
  GUEST_COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  findSessionUser,
  setSessionCookie,
  clearSessionCookie,
  ensureGuestToken,
  cartOwnerKey,
  mergeGuestCart,
  attachIdentity,
  requireAuth,
  requireAdmin,
};
