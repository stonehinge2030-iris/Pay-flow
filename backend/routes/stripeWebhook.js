const express = require('express');
const db = require('../db');
const stripe = require('../stripe');

const router = express.Router();

// IMPORTANT: this route must receive the RAW request body (not JSON-parsed)
// so Stripe's signature can be verified — see server.js, where this router
// is mounted before the express.json() middleware runs on other routes.
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature check failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Stripe can deliver the same event more than once — guard against
  // double-crediting a balance if that happens.
  const already = db.prepare('SELECT id FROM processed_stripe_events WHERE id = ?').get(event.id);
  if (already) return res.json({ received: true, duplicate: true });
  db.prepare('INSERT INTO processed_stripe_events (id) VALUES (?)').run(event.id);

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const userId = Number(intent.metadata?.userId);
    if (userId && intent.metadata?.purpose === 'add_funds') {
      db.transaction(() => {
        db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(
          intent.amount,
          userId
        );
        db.prepare(
          `INSERT INTO transactions (type, to_user_id, amount_cents, status, stripe_ref)
           VALUES ('add_funds', ?, ?, 'completed', ?)`
        ).run(userId, intent.amount, intent.id);
      })();
    }
  }

  res.json({ received: true });
});

module.exports = router;
