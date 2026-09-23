const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const stripe = require('../stripe');

const router = express.Router();

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balanceCents: user.balance_cents,
    payoutReady: !!user.stripe_account_ready,
  };
}

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are all required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
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
    const info = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, stripe_customer_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(name, email.toLowerCase(), passwordHash, customer.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
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

module.exports = { router, publicUser };
