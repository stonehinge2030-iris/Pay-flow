// db.js — a small, file-based SQLite ledger.
//
// Every user has a `balance_cents` column: the source of truth for "how much
// money can this person send right now." That balance only ever changes in
// three places (see routes/payments.js):
//   1. Adding funds increases it after Stripe confirms the card charge.
//   2. Sending money moves it from one user's row to another's, atomically.
//   3. Withdrawing decreases it after a Stripe Transfer + Payout is created.
//
// Every one of those changes is written to the `transactions` table in the
// same database transaction as the balance update, so the ledger and the
// balances can never drift apart — even if the server crashes mid-request.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'payflow.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_account_id TEXT,
    stripe_account_ready INTEGER NOT NULL DEFAULT 0,
    balance_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'eur',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('add_funds', 'send', 'withdraw')),
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    stripe_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Safe migration: CREATE TABLE IF NOT EXISTS above only helps brand-new
// databases. If this file already existed from before the currency column
// was added, add it now without losing any existing data.
const existingColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!existingColumns.includes('currency')) {
  db.exec("ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'eur'");
}

module.exports = db;
