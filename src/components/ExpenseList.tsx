import type { Expense } from '../types';
import { formatRM } from '../lib/money';
import { expenseShares } from '../lib/bill';

interface Props {
  expenses: Expense[];
  nameOf: (id: string) => string;
  peopleCount: number;
  onRemove: (id: string) => void;
}

/** "incl. 10% service + 6% SST" */
function chargesLabel(e: Expense): string {
  const c = e.charges;
  if (!c) return '';
  const parts = [c.servicePct > 0 && `${c.servicePct}% service`, c.sstPct > 0 && `${c.sstPct}% SST`].filter(Boolean);
  return parts.length ? `incl. ${parts.join(' + ')}` : '';
}

export function ExpenseList({ expenses, nameOf, peopleCount, onRemove }: Props) {
  return (
    <section className="card">
      <h2>Expenses</h2>
      {expenses.length === 0 ? (
        <p className="muted">No expenses yet.</p>
      ) : (
        <ul className="expenses">
          {[...expenses].reverse().map((e) => {
            const charges = chargesLabel(e);
            return (
              <li key={e.id}>
                <div>
                  <strong>{e.description}</strong>
                  <span className="muted small">
                    {nameOf(e.paidBy)} paid ·{' '}
                    {e.items?.length
                      ? `${e.items.length} item${e.items.length > 1 ? 's' : ''}, split by what each person had`
                      : e.splitBetween.length === peopleCount
                        ? 'split with everyone'
                        : `split with ${e.splitBetween.map(nameOf).join(', ')}`}
                    {charges && ` · ${charges}`}
                  </span>

                  {e.items?.length ? (
                    <details className="breakdown">
                      <summary className="small">See who pays what</summary>
                      <ul className="small">
                        {e.items.map((it) => (
                          <li key={it.id}>
                            <span>
                              {it.name} <span className="muted">· {it.sharedBy.map(nameOf).join(', ')}</span>
                            </span>
                            <span className="amount">{formatRM(it.priceCents)}</span>
                          </li>
                        ))}
                      </ul>
                      <ul className="small shares">
                        {[...expenseShares(e)].map(([id, cents]) => (
                          <li key={id}>
                            <span>{nameOf(id)}</span>
                            <span className="amount">{formatRM(cents)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
                <span className="amount">{formatRM(e.amountCents)}</span>
                <button className="icon-btn small-btn" type="button" onClick={() => onRemove(e.id)} aria-label={`Delete ${e.description}`}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
