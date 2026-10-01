import { useState, type FormEvent } from 'react';
import type { Person } from '../types';

interface Props {
  people: Person[];
  usedIds: Set<string>;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}

export function PeoplePanel({ people, usedIds, onAdd, onRemove }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`${trimmed} is already in the group.`);
      return;
    }
    onAdd(trimmed);
    setName('');
    setError('');
  };

  return (
    <section className="card">
      <h2>People</h2>
      <form className="inline-form" onSubmit={submit}>
        <input
          aria-label="Name"
          placeholder="Add a name…"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!name.trim()}>
          Add
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {people.length === 0 ? (
        <p className="muted">Add at least two people to start splitting.</p>
      ) : (
        <ul className="chips">
          {people.map((p) => (
            <li key={p.id} className="chip">
              {p.name}
              <button
                type="button"
                className="chip-x"
                onClick={() => onRemove(p.id)}
                disabled={usedIds.has(p.id)}
                title={usedIds.has(p.id) ? 'Remove their expenses first' : `Remove ${p.name}`}
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
