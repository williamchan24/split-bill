import { useState } from 'react';
import type { Person, Transfer } from '../types';
import { formatRM } from '../lib/money';

interface Props {
  title: string;
  people: Person[];
  totalCents: number;
  balances: Map<string, number>;
  transfers: Transfer[];
  nameOf: (id: string) => string;
}

export function Summary({ title, people, totalCents, balances, transfers, nameOf }: Props) {
  const [copied, setCopied] = useState(false);
  const maxAbs = Math.max(1, ...[...balances.values()].map(Math.abs));

  // Plain-text version you can paste straight into a WhatsApp group
  const shareText = [
    `🧾 ${title} — ${formatRM(totalCents)} total`,
    '',
    transfers.length ? 'Who pays who:' : 'Everyone is settled up! 🎉',
    ...transfers.map((t) => `• ${nameOf(t.from)} → ${nameOf(t.to)}: ${formatRM(t.amountCents)}`),
  ].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this:', shareText);
    }
  };

  return (
    <section className="card summary">
      <div className="summary-head">
        <div>
          <p className="muted small">Total spent</p>
          <p className="total">{formatRM(totalCents)}</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={copy} disabled={people.length === 0}>
          {copied ? 'Copied ✓' : 'Copy for WhatsApp'}
        </button>
      </div>

      <h2>Balances</h2>
      <ul className="balances">
        {people.map((p) => {
          const b = balances.get(p.id) ?? 0;
          return (
            <li key={p.id}>
              <span>{p.name}</span>
              <div className="bar-track" aria-hidden="true">
                <div
                  className={`bar ${b >= 0 ? 'pos' : 'neg'}`}
                  style={{ width: `${(Math.abs(b) / maxAbs) * 50}%` }}
                />
              </div>
              <span className={`amount ${b > 0 ? 'pos-text' : b < 0 ? 'neg-text' : 'muted'}`}>
                {b > 0 ? `gets ${formatRM(b)}` : b < 0 ? `owes ${formatRM(-b)}` : 'settled'}
              </span>
            </li>
          );
        })}
      </ul>

      <h2>Settle up</h2>
      {transfers.length === 0 ? (
        <p className="muted">Nothing to settle — everyone's even. 🎉</p>
      ) : (
        <ol className="transfers">
          {transfers.map((t, i) => (
            <li key={i}>
              <strong>{nameOf(t.from)}</strong>
              <span className="arrow">pays</span>
              <strong>{nameOf(t.to)}</strong>
              <span className="amount">{formatRM(t.amountCents)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
