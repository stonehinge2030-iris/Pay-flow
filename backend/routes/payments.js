const express = require('express');
const db = require('../db');
const stripe = require('../stripe');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MIN_CENTS = 100; // $1 minimum on any money movement

// ---- Add funds -------------------------------------------------------
// Step 1 of 2. The frontend calls this to get a Stripe PaymentIntent, then
// confirms it client-side with Stripe.js (card number never touches our
// server). We only credit the user's balance once Stripe's webhook tells us
// the charge actually succeeded — see routes/stripeWebhook.js. Never trust
// a client-reported "it worked."
router.post('/add-funds/intent', requireAuth, async (req, res) => {
  const amountCents = Math.round(Number(req.body?.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS) {
    return res.status(400).json({ error: 'Enter an amount of at least $1.' });
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      customer: req.user.stripe_customer_id,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: String(req.user.id), purpose: 'add_funds' },
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error('Creating add-funds intent failed:', err.message);
    res.status(502).json({ error: 'Could not start that payment. Try again.' });
  }
});

// ---- Send money --------------------------------------------------------
// Pure bookkeeping: the money is already sitting in the platform's Stripe
// balance from a prior add-funds charge, so sending is just moving cents
// from one ledger row to another. Wrapped in a DB transaction so a crash
// mid-request can never debit one side without crediting the other.
router.post('/send', requireAuth, (req, res) => {
  const amountCents = Math.round(Number(req.body?.amountCents));
  const toEmail = String(req.body?.toEmail || '').toLowerCase().trim();
  const note = req.body?.note ? String(req.body.note).slice(0, 200) : null;

  if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS) {
    return res.status(400).json({ error: 'Enter an amount of at least $1.' });
  }
  if (!toEmail) return res.status(400).json({ error: "Enter who you're sending to." });

  const recipient = db.prepare('SELECT * FROM users WHERE email = ?').get(toEmail);
  if (!recipient) return res.status(404).json({ error: 'No PayFlow account with that email.' });
  if (recipient.id === req.user.id) {
    return res.status(400).json({ error: "You can't send money to yourself." });
  }

  const transfer = db.transaction(() => {
    const sender = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.user.id);
    if (sender.balance_cents < amountCents) {
      throw Object.assign(new Error('insufficient_funds'), { code: 'insufficient_funds' });
    }
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(
      amountCents,
      req.user.id
    );
    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(
      amountCents,
      recipient.id
    );
    return db
      .prepare(
        `INSERT INTO transactions (type, from_user_id, to_user_id, amount_cents, note, status)
         VALUES ('send', ?, ?, ?, ?, 'completed')`
      )
      .run(req.user.id, recipient.id, amountCents, note);
  });

  try {
    transfer();
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 'insufficient_funds') {
      return res.status(400).json({ error: "You don't have enough balance for that." });
    }
    console.error('Send money failed:', err.message);
    res.status(500).json({ error: 'Could not complete that transfer.' });
  }
});

// ---- Withdraw to bank ---------------------------------------------------
// Moves funds out of the platform's Stripe balance into the user's own
// connected Express account via a Transfer. Stripe then pays that out to
// their linked bank account on that account's normal payout schedule.
router.post('/withdraw', requireAuth, async (req, res) => {
  const amountCents = Math.round(Number(req.body?.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS) {
    return res.status(400).json({ error: 'Enter an amount of at least $1.' });
  }
  if (req.user.balance_cents < amountCents) {
    return res.status(400).json({ error: "You don't have enough balance for that." });
  }
  if (!req.user.stripe_account_id || !req.user.stripe_account_ready) {
    return res.status(400).json({ error: 'Finish linking a bank account before withdrawing.' });
  }

  try {
    const stripeTransfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'eur',
      destination: req.user.stripe_account_id,
      metadata: { userId: String(req.user.id), purpose: 'withdraw' },
    });

    db.transaction(() => {
      db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(
        amountCents,
        req.user.id
      );
      db.prepare(
        `INSERT INTO transactions (type, from_user_id, amount_cents, status, stripe_ref)
         VALUES ('withdraw', ?, ?, 'completed', ?)`
      ).run(req.user.id, amountCents, stripeTransfer.id);
    })();

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Withdraw failed:', err.message);
    res.status(502).json({ error: 'Could not process that withdrawal right now.' });
  }
});

// ---- History -------------------------------------------------------------
router.get('/transactions', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, fu.name AS from_name, fu.email AS from_email,
              tu.name AS to_name, tu.email AS to_email
       FROM transactions t
       LEFT JOIN users fu ON fu.id = t.from_user_id
       LEFT JOIN users tu ON tu.id = t.to_user_id
       WHERE t.from_user_id = ? OR t.to_user_id = ?
       ORDER BY t.created_at DESC
       LIMIT 100`
    )
    .all(req.user.id, req.user.id);

  res.json({ transactions: rows });
});

module.exports = router;
