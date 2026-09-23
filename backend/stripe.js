const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    'STRIPE_SECRET_KEY is not set. Copy .env.example to .env and fill in your Stripe test keys.'
  );
}

module.exports = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});
