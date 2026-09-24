import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TransactionRow, { formatCents } from '../components/TransactionRow';
import { PlusIcon, SendIcon, BankIcon } from '../components/Icons';
import FlowLine from '../components/FlowLine';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function AddFundsForm({ onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [amount, setAmount] = useState('20');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | processing

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 100) {
      setError('Enter an amount of at least 1.');
      return;
    }
    if (!stripe || !elements) return;

    setStatus('processing');
    // Some payment methods (PayPal, Revolut Pay, Wero) redirect off-site to
    // confirm, then send the browser back here — so unlike a card-only
    // flow, we can't just check the result in this function. Dashboard's
    // useEffect (below) picks the flow back up on return, using the
    // payment_intent_client_secret Stripe appends to the return URL.
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?add_funds=complete`,
      },
    });

    // Only reachable for payment methods that DON'T redirect (e.g. cards
    // can complete without leaving the page) — a failure here.
    if (result.error) {
      setError(result.error.message);
      setStatus('idle');
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label htmlFor="amount">Amount ({user.currency.toUpperCase()})</label>
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
        <PaymentElement />
      </div>
      <button className="btn btn-primary" disabled={!stripe || status === 'processing'}>
        {status === 'processing' ? 'Processing…' : 'Add funds'}
      </button>
    </form>
  );
}

// Wraps AddFundsForm in Elements once we know the amount, since the
// PaymentElement needs a clientSecret (and therefore an amount) up front —
// unlike the old CardElement, which didn't care about the amount until
// submit time.
function AddFundsFlow({ onDone }) {
  const { token } = useAuth();
  const [amount, setAmount] = useState('20');
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');

  async function startIntent(e) {
    e.preventDefault();
    setError('');
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 100) {
      setError('Enter an amount of at least 1.');
      return;
    }
    try {
      const { clientSecret } = await api.addFundsIntent(amountCents, token);
      setClientSecret(clientSecret);
    } catch (err) {
      setError(err.message);
    }
  }

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <AddFundsForm onDone={onDone} />
      </Elements>
    );
  }

  return (
    <form onSubmit={startIntent} className="form-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label htmlFor="startAmount">Amount</label>
        <input
          id="startAmount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <button className="btn btn-primary">Continue</button>
    </form>
  );
}

export default function Dashboard() {
  const { user, token, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent
  const [returnBanner, setReturnBanner] = useState(null); // null | 'success' | 'processing' | 'failed'

  async function handleResend() {
    setResendState('sending');
    try {
      await api.resendVerification(token);
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  }

  async function loadTransactions() {
    const { transactions: rows } = await api.transactions(token);
    setTransactions(rows.slice(0, 6));
  }

  useEffect(() => {
    loadTransactions();

    // Coming back from a redirect-based payment method (PayPal, Revolut
    // Pay, Wero)? Stripe appends these params to the return_url above.
    const params = new URLSearchParams(window.location.search);
    const clientSecret = params.get('payment_intent_client_secret');
    if (params.get('add_funds') === 'complete' && clientSecret) {
      loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
        .then((stripe) => stripe.retrievePaymentIntent(clientSecret))
        .then(({ paymentIntent }) => {
          if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
            setReturnBanner(paymentIntent.status === 'succeeded' ? 'success' : 'processing');
            // The balance itself is credited by our backend via Stripe's
            // webhook, not by this client-side check — give it a moment.
            setTimeout(async () => {
              await refreshUser();
              loadTransactions();
            }, 1500);
          } else {
            setReturnBanner('failed');
          }
        });
      // Clean the URL so refreshing the page doesn't re-trigger this.
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  return (
    <div>
      <h1 className="page-title">Home</h1>

      {returnBanner === 'success' && (
        <div className="success-banner">Payment confirmed — updating your balance…</div>
      )}
      {returnBanner === 'processing' && (
        <div className="success-banner">Your payment is processing — your balance will update shortly.</div>
      )}
      {returnBanner === 'failed' && (
        <div className="error-banner">That payment didn't go through. You can try again below.</div>
      )}

      {!user.emailVerified && (
        <div className="verify-banner">
          <span>Verify your email to keep your account secure.</span>
          {resendState === 'sent' ? (
            <span className="verify-sent">Email sent — check your inbox.</span>
          ) : (
            <button className="verify-resend" onClick={handleResend} disabled={resendState === 'sending'}>
              {resendState === 'sending' ? 'Sending…' : 'Resend email'}
            </button>
          )}
        </div>
      )}

      <div className="balance-card">
        <FlowLine className="balance-flow" />
        <p className="balance-label">Your balance</p>
        <p className="balance-amount">{formatCents(user.balanceCents, user.currency)}</p>
        <div className="balance-actions">
          <button className="btn" onClick={() => { setShowAddFunds((v) => !v); setShowWithdraw(false); }}>
            <PlusIcon width={15} height={15} /> Add funds
          </button>
          <Link className="btn" to="/send">
            <SendIcon width={15} height={15} /> Send
          </Link>
          <button className="btn" onClick={() => { setShowWithdraw((v) => !v); setShowAddFunds(false); }}>
            <BankIcon width={15} height={15} /> Withdraw
          </button>
        </div>
      </div>

      {showAddFunds && (
        <AddFundsFlow
          onDone={() => {
            setShowAddFunds(false);
            loadTransactions();
          }}
        />
      )}

      {showWithdraw && <WithdrawForm onDone={() => { setShowWithdraw(false); loadTransactions(); }} />}

      <p className="section-heading" style={{ marginTop: 28 }}>Recent activity</p>
      <div className="ledger">
        {transactions.length === 0 && (
          <p className="empty-state">Add funds or send your first payment to get started.</p>
        )}
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} currentUserId={user.id} currency={user.currency} />
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
      setError('Enter an amount of at least 1.');
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
        <label htmlFor="withdrawAmount">Amount ({user.currency.toUpperCase()})</label>
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
