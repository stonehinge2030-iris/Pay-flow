import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TransactionRow, { formatCents } from '../components/TransactionRow';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function AddFundsForm({ onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const { token, refreshUser } = useAuth();
  const [amount, setAmount] = useState('20');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | processing | success

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 100) {
      setError('Enter an amount of at least $1.');
      return;
    }
    if (!stripe || !elements) return;

    setStatus('processing');
    try {
      const { clientSecret } = await api.addFundsIntent(amountCents, token);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (result.error) {
        setError(result.error.message);
        setStatus('idle');
        return;
      }
      // The balance itself is credited by our backend via Stripe's webhook,
      // not by this client-side confirmation — give it a moment to land.
      setStatus('success');
      setTimeout(async () => {
        await refreshUser();
        onDone();
      }, 1200);
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return <div className="success-banner">Payment confirmed — updating your balance…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label htmlFor="amount">Amount (USD)</label>
        <input
          id="amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="card-element-wrap">
        <CardElement options={{ style: { base: { fontSize: '15px' } } }} />
      </div>
      <button className="btn btn-primary" disabled={!stripe || status === 'processing'}>
        {status === 'processing' ? 'Processing…' : `Add ${amount ? `$${amount}` : 'funds'}`}
      </button>
    </form>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  async function loadTransactions() {
    const { transactions: rows } = await api.transactions(token);
    setTransactions(rows.slice(0, 6));
  }

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  return (
    <div>
      <h1 className="page-title">Home</h1>

      <div className="balance-card">
        <p className="balance-label">Your balance</p>
        <p className="balance-amount">{formatCents(user.balanceCents)}</p>
        <div className="balance-actions">
          <button className="btn" onClick={() => { setShowAddFunds((v) => !v); setShowWithdraw(false); }}>
            Add funds
          </button>
          <Link className="btn" to="/send">Send</Link>
          <button className="btn" onClick={() => { setShowWithdraw((v) => !v); setShowAddFunds(false); }}>
            Withdraw
          </button>
        </div>
      </div>

      {showAddFunds && (
        <Elements stripe={stripePromise}>
          <AddFundsForm
            onDone={() => {
              setShowAddFunds(false);
              loadTransactions();
            }}
          />
        </Elements>
      )}

      {showWithdraw && <WithdrawForm onDone={() => { setShowWithdraw(false); loadTransactions(); }} />}

      <p className="section-heading" style={{ marginTop: 28 }}>Recent activity</p>
      <div className="ledger">
        {transactions.length === 0 && <p className="empty-state">Nothing here yet.</p>}
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} currentUserId={user.id} />
        ))}
      </div>
      {transactions.length > 0 && (
        <p className="switch-link" style={{ textAlign: 'left', marginTop: 12 }}>
          <Link to="/activity">See all activity →</Link>
        </p>
      )}
    </div>
  );
}

function WithdrawForm({ onDone }) {
  const { user, token, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user.payoutReady) {
    return (
      <div className="form-card">
        <p style={{ margin: '0 0 12px', fontSize: 14 }}>
          Link a bank account before withdrawing.
        </p>
        <Link className="btn btn-secondary" to="/onboarding">Link bank account</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 100) {
      setError('Enter an amount of at least $1.');
      return;
    }
    setLoading(true);
    try {
      await api.withdraw(amountCents, token);
      await refreshUser();
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label htmlFor="withdrawAmount">Amount (USD)</label>
        <input
          id="withdrawAmount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" disabled={loading}>
        {loading ? 'Sending…' : 'Withdraw to bank'}
      </button>
    </form>
  );
}
