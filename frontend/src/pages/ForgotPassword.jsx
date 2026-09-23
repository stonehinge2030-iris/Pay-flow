import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FlowLine from '../components/FlowLine';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="wordmark">PayFlow</span>
          <FlowLine className="auth-flow" />
        </div>

        {sent ? (
          <>
            <h1>Check your email</h1>
            <p className="auth-sub">
              If an account exists for {email}, we've sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link className="btn btn-secondary" to="/login">Back to login</Link>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="switch-link">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
