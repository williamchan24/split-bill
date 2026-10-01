import type { Expense } from '../types';
import { formatRM } from '../lib/money';

interface Props {
  expenses: Expense[];
  nameOf: (id: string) => string;
  peopleCount: number;
  onRemove: (id: string) => void;
}

export function ExpenseList({ expenses, nameOf, peopleCount, onRemove }: Props) {
  return (
    <section className="card">
      <h2>Expenses</h2>
      {expenses.length === 0 ? (
        <p className="muted">No expenses yet.</p>
      ) : (
        <ul className="expenses">
          {[...expenses].reverse().map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.description}</strong>
                <span className="muted small">
                  {nameOf(e.paidBy)} paid ·{' '}
                  {e.splitBetween.length === peopleCount
                    ? 'split with everyone'
                    : `split with ${e.splitBetween.map(nameOf).join(', ')}`}
                </span>
              </div>
              <span className="amount">{formatRM(e.amountCents)}</span>
              <button className="icon-btn small-btn" type="button" onClick={() => onRemove(e.id)} aria-label={`Delete ${e.description}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
