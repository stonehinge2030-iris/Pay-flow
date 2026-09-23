import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const { user, token, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('complete') === '1') {
      setChecking(true);
      api
        .refreshPayoutStatus(token)
        .then(() => refreshUser())
        .finally(() => setChecking(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOnboarding() {
    setError('');
    setLoading(true);
    try {
      const { url } = await api.payoutOnboardingLink(token);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Bank account</h1>
      <div className="form-card">
        <span className={`payout-status`}>
          <span className={`dot ${user?.payoutReady ? 'ready' : ''}`} />
          {checking ? 'Checking status…' : user?.payoutReady ? 'Ready for withdrawals' : 'Not linked yet'}
        </span>
        {error && <div className="error-banner">{error}</div>}
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>
          {user?.payoutReady
            ? "Your bank account is linked. You can withdraw your balance any time from Home."
            : "You'll be taken to Stripe to verify your identity and link a bank account, so money you withdraw has somewhere to go."}
        </p>
        <button className="btn btn-primary" onClick={startOnboarding} disabled={loading}>
          {loading ? 'Redirecting…' : user?.payoutReady ? 'Update bank details' : 'Link bank account'}
        </button>
      </div>
    </div>
  );
}
