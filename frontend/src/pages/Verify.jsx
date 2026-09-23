import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import FlowLine from '../components/FlowLine';
import { CheckCircleIcon } from '../components/Icons';

export default function Verify() {
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('checking'); // checking | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setError('This link is missing its verification code.');
      return;
    }
    api
      .verifyEmail(token)
      .then(async () => {
        setStatus('success');
        await refreshUser();
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand">
          <span className="wordmark">PayFlow</span>
          <FlowLine className="auth-flow" />
        </div>

        {status === 'checking' && <p className="auth-sub">Confirming your email…</p>}

        {status === 'success' && (
          <>
            <div style={{ color: 'var(--current)', margin: '0 auto 12px', width: 40 }}>
              <CheckCircleIcon width={40} height={40} />
            </div>
            <h1>Email verified</h1>
            <p className="auth-sub">Your address is confirmed. You're all set.</p>
            <Link className="btn btn-primary" to="/">Go to your account</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1>Couldn't verify that link</h1>
            <p className="auth-sub">{error}</p>
            <Link className="btn btn-secondary" to="/">Go to your account</Link>
          </>
        )}
      </div>
    </div>
  );
}
