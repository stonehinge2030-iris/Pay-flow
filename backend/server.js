require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const paymentsRouter = require('./routes/payments');
const stripeWebhookRouter = require('./routes/stripeWebhook');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Mounted BEFORE express.json() because Stripe webhook signature
// verification needs the raw, unparsed request body.
app.use('/api/webhooks/stripe', stripeWebhookRouter);

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/payments', paymentsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`PayFlow backend running on http://localhost:${port}`);
});
