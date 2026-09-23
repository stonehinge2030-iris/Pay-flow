import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TransactionRow from '../components/TransactionRow';

export default function Activity() {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.transactions(token).then(({ transactions }) => setTransactions(transactions));
  }, [token]);

  return (
    <div>
      <h1 className="page-title">Activity</h1>
      <div className="ledger">
        {transactions.length === 0 && (
          <p className="empty-state">No activity yet — it'll show up here once you add funds or send a payment.</p>
        )}
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} currentUserId={user.id} currency={user.currency} />
        ))}
      </div>
    </div>
  );
}
