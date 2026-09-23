import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SendMoney() {
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    setError('');
    setRecipient(null);
    if (!email) return;
    try {
      const { user } = await api.lookup(email, token);
      setRecipient(user);
    } catch (err) {
      setError(err.message);
    }
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
      await api.send({ toEmail: email, amountCents, note }, token);
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Send money</h1>
      <form onSubmit={handleSubmit} className="form-card">
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="toEmail">Recipient's email</label>
          <input
            id="toEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleLookup}
            required
          />
        </div>
        {recipient && <p className="lookup-result">Sending to {recipient.name}</p>}

        <div className="field">
          <label htmlFor="sendAmount">Amount (USD)</label>
          <input
            id="sendAmount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's it for?"
          />
        </div>

        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Sending…' : 'Send money'}
        </button>
      </form>
    </div>
  );
}
