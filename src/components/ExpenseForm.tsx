import { useEffect, useState, type FormEvent } from 'react';
import type { Expense, Person } from '../types';
import { parseRM } from '../lib/money';

interface Props {
  people: Person[];
  onAdd: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
}

export function ExpenseForm({ people, onAdd }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Keep the form in sync when people are added/removed: default to "everyone".
  useEffect(() => {
    const ids = people.map((p) => p.id);
    setPaidBy((current) => (ids.includes(current) ? current : (ids[0] ?? '')));
    setSplitBetween(ids);
  }, [people]);

  if (people.length < 2) return null;

  const toggle = (id: string) =>
    setSplitBetween((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amountCents = parseRM(amount);
    if (!description.trim()) return setError('What was it for?');
    if (amountCents === null) return setError('Enter an amount like 25 or 12.50');
    if (splitBetween.length === 0) return setError('Pick at least one person to split with.');

    // Keep the split order the same as the people list (decides who gets the leftover sen).
    const ordered = people.map((p) => p.id).filter((id) => splitBetween.includes(id));
    onAdd({ description: description.trim(), amountCents, paidBy, splitBetween: ordered });
    setDescription('');
    setAmount('');
    setError('');
  };

  return (
    <section className="card">
      <h2>Add an expense</h2>
      <form className="stack" onSubmit={submit}>
        <label>
          What for
          <input value={description} maxLength={60} placeholder="e.g. Nasi lemak breakfast" onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="row">
          <label>
            Amount (RM)
            <input inputMode="decimal" value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Paid by
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend>
            Split between
            <button type="button" className="link" onClick={() => setSplitBetween(people.map((p) => p.id))}>
              everyone
            </button>
          </legend>
          <div className="chips">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip toggle ${splitBetween.includes(p.id) ? 'on' : ''}`}
                aria-pressed={splitBetween.includes(p.id)}
                onClick={() => toggle(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          Add expense
        </button>
      </form>
    </section>
  );
}
