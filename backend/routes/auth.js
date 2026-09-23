const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const stripe = require('../stripe');
const { SUPPORTED_CURRENCIES, isSupportedCurrency } = require('../currencies');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../email');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

function verificationUrlFor(token) {
  return `${process.env.FRONTEND_URL}/verify?token=${token}`;
}

function resetUrlFor(token) {
  return `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
}

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balanceCents: user.balance_cents,
    currency: user.currency,
    payoutReady: !!user.stripe_account_ready,
    emailVerified: !!user.email_verified,
  };
}

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  const currency = String(req.body?.currency || 'eur').toLowerCase();

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are all required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!isSupportedCurrency(currency)) {
    return res.status(400).json({ error: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ').toUpperCase()}` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  try {
    // A Stripe Customer is where this user's saved payment methods live,
    // used later when they add funds to their balance.
    const customer = await stripe.customers.create({ name, email });

    const passwordHash = bcrypt.hashSync(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const info = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, stripe_customer_id, currency, verification_token)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(name, email.toLowerCase(), passwordHash, customer.id, currency, verificationToken);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    sendVerificationEmail(user.email, user.name, verificationUrlFor(verificationToken));
    res.status(201).json({ token: issueToken(user.id), user: publicUser(user) });
  } catch (err) {
    console.error('Signup failed:', err.message);
    res.status(502).json({ error: 'Could not create your account right now. Try again shortly.' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  res.json({ token: issueToken(user.id), user: publicUser(user) });
});

// Clicked from the link in the verification email. No auth required — the
// token itself, being long and random, is what proves it's really this
// person's inbox.
router.post('/verify-email', (req, res) => {
  const token = String(req.body?.token || '');
  if (!token) return res.status(400).json({ error: 'Missing verification token.' });

  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ error: 'This verification link is invalid or has already been used.' });
  }

  db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
  res.json({ ok: true });
});

// Lets a logged-in but not-yet-verified user request a fresh link, in case
// the first email never arrived or the link expired from a new signup.
router.post('/resend-verification', requireAuth, (req, res) => {
  if (req.user.email_verified) {
    return res.json({ ok: true, alreadyVerified: true });
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(token, req.user.id);
  sendVerificationEmail(req.user.email, req.user.name, verificationUrlFor(token));
  res.json({ ok: true });
});

// Always responds the same way whether or not the email exists — otherwise
// this endpoint could be used to check which emails have PayFlow accounts.
router.post('/forgot-password', (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const genericReply = {
    ok: true,
    message: "If an account exists for that email, we've sent a reset link.",
  };
  if (!email) return res.json(genericReply);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(
      token,
      expires,
      user.id
    );
    sendPasswordResetEmail(user.email, user.name, resetUrlFor(token));
  }

  res.json(genericReply);
});

router.post('/reset-password', (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');

  if (!token) return res.status(400).json({ error: 'Missing reset token.' });
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
  ).run(passwordHash, user.id);

  res.json({ ok: true });
});

module.exports = { router, publicUser };
