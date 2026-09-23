const express = require('express');
const db = require('../db');
const stripe = require('../stripe');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Look up someone to send money to. Only returns the minimum needed to
// confirm you've got the right person — never balances or Stripe IDs.
router.get('/lookup', requireAuth, (req, res) => {
  const email = String(req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Provide an email to look up.' });

  const user = db.prepare('SELECT id, name, email, currency FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No PayFlow account with that email.' });
  if (user.id === req.user.id) {
    return res.status(400).json({ error: "That's your own account." });
  }
  res.json({ user });
});

// Start (or resume) Stripe Connect Express onboarding, so this user can
// receive payouts to their bank account when they withdraw their balance.
router.post('/payout-onboarding-link', requireAuth, async (req, res) => {
  try {
    let accountId = req.user.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: req.user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      db.prepare('UPDATE users SET stripe_account_id = ? WHERE id = ?').run(accountId, req.user.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/onboarding?refresh=1`,
      return_url: `${process.env.FRONTEND_URL}/onboarding?complete=1`,
      type: 'account_onboarding',
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error('Onboarding link failed:', err.message);
    res.status(502).json({ error: 'Could not start payout setup right now.' });
  }
});

// Called when the user lands back from Stripe, to refresh whether they can
// actually receive payouts yet (Stripe finishes verification async).
router.post('/payout-status/refresh', requireAuth, async (req, res) => {
  if (!req.user.stripe_account_id) {
    return res.json({ payoutReady: false });
  }
  try {
    const account = await stripe.accounts.retrieve(req.user.stripe_account_id);
    const ready = !!(account.payouts_enabled && account.charges_enabled);
    db.prepare('UPDATE users SET stripe_account_ready = ? WHERE id = ?').run(ready ? 1 : 0, req.user.id);
    res.json({ payoutReady: ready });
  } catch (err) {
    console.error('Status refresh failed:', err.message);
    res.status(502).json({ error: 'Could not check payout status right now.' });
  }
});

module.exports = router;
