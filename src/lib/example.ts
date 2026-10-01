import type { AppState } from '../types';

/** Demo data shown on first visit, so the app isn't empty when people open it. */
export function exampleState(): AppState {
  const [p1, p2, p3, p4] = ['Person 1', 'Person 2', 'Person 3', 'Person 4'].map((name) => ({
    id: crypto.randomUUID(),
    name,
  }));
  const all = [p1.id, p2.id, p3.id, p4.id];
  const now = Date.now();

  return {
    title: 'Split Bill',
    people: [p1, p2, p3, p4],
    expenses: [
      { id: crypto.randomUUID(), description: 'Airbnb (2 nights)', amountCents: 48000, paidBy: p1.id, splitBetween: all, createdAt: now - 4000 },
      { id: crypto.randomUUID(), description: 'Grab from airport', amountCents: 3850, paidBy: p2.id, splitBetween: all, createdAt: now - 3000 },
      { id: crypto.randomUUID(), description: 'Char kway teow & cendol', amountCents: 6400, paidBy: p3.id, splitBetween: all, createdAt: now - 2000 },
      { id: crypto.randomUUID(), description: 'Penang Hill tickets', amountCents: 12000, paidBy: p4.id, splitBetween: [p1.id, p2.id, p4.id], createdAt: now - 1000 },
    ],
  };
}

export function emptyState(): AppState {
  return { title: 'New group', people: [], expenses: [] };
}
