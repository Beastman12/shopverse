'use strict';

const express = require('express');
const { db } = require('../db');
const {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  mergeGuestCart,
} = require('../lib/auth');
const { asyncRoute, HttpError, cleanText, isEmail } = require('../lib/http');

const router = express.Router();

/* Simple in-memory throttle for credential endpoints. */
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function throttleAuth(req) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many attempts. Please try again in a few minutes.');
  }
  if (attempts.size > 1000) {
    for (const [ip, entry] of attempts) {
      if (entry.resetAt < now) attempts.delete(ip);
    }
  }
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

router.post(
  '/register',
  asyncRoute(async (req, res) => {
    throttleAuth(req);

    const name = cleanText(req.body.name, 80);
    const email = cleanText(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) throw new HttpError(400, 'Please enter your full name.');
    if (!isEmail(email)) throw new HttpError(400, 'Please enter a valid email address.');
    if (password.length < 8) {
      throw new HttpError(400, 'Your password needs at least 8 characters.');
    }
    if (password.length > 200) throw new HttpError(400, 'That password is too long.');

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) throw new HttpError(409, 'An account with that email already exists.');

    const passwordHash = await hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, ?, 'customer')`
      )
      .run(name, email, passwordHash);

    const userId = Number(result.lastInsertRowid);
    mergeGuestCart(req.guestToken, userId);

    const token = createSession(userId);
    setSessionCookie(res, token);

    res.status(201).json({
      user: { id: userId, name, email, role: 'customer' },
      message: `Welcome to ShopVerse, ${name.split(' ')[0]}!`,
    });
  })
);

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    throttleAuth(req);

    const email = cleanText(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');

    if (!isEmail(email) || !password) {
      throw new HttpError(400, 'Enter your email and password.');
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const valid = user ? await verifyPassword(password, user.password_hash) : false;
    if (!valid) throw new HttpError(401, 'Incorrect email or password.');

    mergeGuestCart(req.guestToken, user.id);
    const token = createSession(user.id);
    setSessionCookie(res, token);

    res.json({
      user: publicUser(user),
      message: `Welcome back, ${user.name.split(' ')[0]}!`,
    });
  })
);

router.post(
  '/logout',
  asyncRoute(async (req, res) => {
    destroySession(req.cookies[SESSION_COOKIE]);
    clearSessionCookie(res);
    res.json({ message: 'You have been signed out.' });
  })
);

router.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

module.exports = { router };
