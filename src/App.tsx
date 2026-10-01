import { useMemo } from 'react';
import type { Expense } from './types';
import { usePersistentState } from './hooks/usePersistentState';
import { computeBalances, settleUp } from './lib/settle';
import { emptyState, exampleState } from './lib/example';
import { PeoplePanel } from './components/PeoplePanel';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Summary } from './components/Summary';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [state, setState] = usePersistentState('split-bill:v1', exampleState);
  const { title, people, expenses } = state;

  // useMemo = only recalculate when people/expenses actually change
  const balances = useMemo(() => computeBalances(people.map((p) => p.id), expenses), [people, expenses]);
  const transfers = useMemo(() => settleUp(balances), [balances]);
  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const usedIds = useMemo(() => new Set(expenses.flatMap((e) => [e.paidBy, ...e.splitBetween])), [expenses]);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? '?';

  const addPerson = (name: string) =>
    setState((s) => ({ ...s, people: [...s.people, { id: crypto.randomUUID(), name }] }));
  const removePerson = (id: string) => setState((s) => ({ ...s, people: s.people.filter((p) => p.id !== id) }));
  const addExpense = (e: Omit<Expense, 'id' | 'createdAt'>) =>
    setState((s) => ({ ...s, expenses: [...s.expenses, { ...e, id: crypto.randomUUID(), createdAt: Date.now() }] }));
  const removeExpense = (id: string) => setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));

  const startFresh = () => {
    if (window.confirm('Clear everything and start a new group?')) setState(emptyState());
  };

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <span className="brand">
            Split<span>Bill</span>
          </span>
          <div className="topbar-actions">
            <button className="link" type="button" onClick={startFresh}>
              New group
            </button>
            <button className="link" type="button" onClick={() => setState(exampleState())}>
              Load example
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container">
        <input
          className="title-input"
          value={title}
          maxLength={60}
          aria-label="Group name"
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
        />
        <p className="muted intro">Add who's in, log who paid for what, and get the fewest payments to settle up.</p>

        <div className="layout">
          <div className="col">
            <PeoplePanel people={people} usedIds={usedIds} onAdd={addPerson} onRemove={removePerson} />
            <ExpenseForm people={people} onAdd={addExpense} />
          </div>
          <div className="col">
            <Summary title={title} people={people} totalCents={totalCents} balances={balances} transfers={transfers} nameOf={nameOf} />
            <ExpenseList expenses={expenses} nameOf={nameOf} peopleCount={people.length} onRemove={removeExpense} />
          </div>
        </div>
      </main>

      <footer className="container footer muted small">
        Data stays in your browser — nothing is uploaded. Built with React + TypeScript.
      </footer>
    </>
  );
}
