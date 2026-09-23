# PayFlow — P2P payments on Stripe Connect

A working peer-to-peer payment app: users add funds from a card, send money
to each other by email, and withdraw to their own bank account. Real money
moves through Stripe — this isn't a simulation — but you're responsible for
completing Stripe's account requirements before going live (see below).

## How it actually moves money

1. **Add funds** — the frontend collects card details with Stripe Elements
   (the card number never touches your server) and confirms a
   `PaymentIntent`. Stripe then sends your backend a **webhook**, and only
   that webhook credits the user's balance. This matters: never trust a
   client saying "payment succeeded" for something that credits money —
   only trust Stripe telling your server directly.
2. **Send money** — this is bookkeeping, not a new Stripe charge. The funds
   from step 1 already sit in your platform's Stripe balance, so sending
   just moves cents from one user's ledger row to another's inside a single
   database transaction.
3. **Withdraw** — creates a Stripe `Transfer` to the recipient's own
   **Connect Express account**, which Stripe then pays out to their bank on
   that account's normal schedule. Every user links their bank account once
   via Stripe's hosted onboarding flow (the "Bank account" page).

## Before you touch real money

Stripe requires this regardless of what code you run:

- **Activate your Stripe account** for live payments (business details,
  bank account for your platform, etc.) — in the Stripe Dashboard, not here.
- **Stripe Connect** must be enabled on your account (Dashboard → Connect →
  Get started). This app uses Express accounts.
- Depending on your country and volume, moving money between third parties
  like this may require your own **money transmitter licensing** even when
  using Stripe Connect — Stripe's Connect docs and your own legal counsel
  are the right source here, not this README.
- Start with **test mode** (`sk_test_...` / `pk_test_...` keys) and Stripe's
  test card `4242 4242 4242 4242` — everything above works identically in
  test mode with fake money.

## Project layout

```
backend/    Express API, SQLite ledger, Stripe Connect + webhook logic
frontend/   React (Vite) app — signup/login, dashboard, send, onboarding
```

## Running it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:
- `STRIPE_SECRET_KEY` — from https://dashboard.stripe.com/test/apikeys
- `JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `STRIPE_WEBHOOK_SECRET` — see step 3 below

```bash
npm start
```

The API runs on `http://localhost:4000` and creates `payflow.db`
(SQLite) automatically on first run.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env`:
- `VITE_STRIPE_PUBLISHABLE_KEY` — the `pk_test_...` key from the same
  Stripe dashboard page as above

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### 3. Stripe webhook (required for "add funds" to work)

In a third terminal, using the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe login
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Copy the `whsec_...` value it prints into `backend/.env` as
`STRIPE_WEBHOOK_SECRET`, then restart the backend. In production, you'd
instead create this webhook endpoint in the Stripe Dashboard pointing at
your real server URL.

### 4. Try it

1. Sign up two accounts (e.g. two browser profiles, or incognito for the
   second).
2. On account A: Home → Add funds → use test card `4242 4242 4242 4242`,
   any future expiry, any CVC.
3. Send money from A to B by B's email.
4. On account B: Bank account → Link bank account → complete Stripe's test
   onboarding → Home → Withdraw.

## What's deliberately left out (add before real users touch this)

- **Rate limiting & fraud checks** — Stripe Radar helps on the card side,
  but nothing here caps how fast a compromised account can drain itself.
- **Email verification & password reset.**
- **Stronger session handling** — tokens live in `localStorage`; a
  production build should weigh httpOnly cookies instead.
- **Idempotency keys** on the `/send` and `/withdraw` endpoints, so a
  retried request from a flaky connection can't double-charge.
- **Real hosting for the database** — SQLite-on-disk is fine for
  development; use Postgres (or similar) once you deploy for real.
