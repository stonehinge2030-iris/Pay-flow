function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function describe(tx, currentUserId) {
  if (tx.type === 'add_funds') {
    return { title: 'Added funds', meta: 'From your card', sign: '+' };
  }
  if (tx.type === 'withdraw') {
    return { title: 'Withdrew to bank', meta: 'Sent to your linked account', sign: '-' };
  }
  // send
  const isOutgoing = tx.from_user_id === currentUserId;
  return {
    title: isOutgoing ? `To ${tx.to_name}` : `From ${tx.from_name}`,
    meta: tx.note || (isOutgoing ? tx.to_email : tx.from_email),
    sign: isOutgoing ? '-' : '+',
  };
}

export default function TransactionRow({ tx, currentUserId }) {
  const { title, meta, sign } = describe(tx, currentUserId);
  const when = new Date(tx.created_at + 'Z').toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="ledger-row">
      <div className="ledger-main">
        <span className="ledger-title">{title}</span>
        <span className="ledger-meta">{meta} · {when}</span>
      </div>
      <span className={`ledger-amount ${sign === '+' ? 'positive' : 'negative'}`}>
        {sign}
        {formatCents(tx.amount_cents)}
      </span>
    </div>
  );
}

export { formatCents };
