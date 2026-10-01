import type { AppState } from '../types';

/** Demo data shown on first visit, so the app isn't empty when people open it. */
export function exampleState(): AppState {
  const [ali, mei, raj, sarah] = ['Ali', 'Mei Ling', 'Raj', 'Sarah'].map((name) => ({
    id: crypto.randomUUID(),
    name,
  }));
  const all = [ali.id, mei.id, raj.id, sarah.id];
  const now = Date.now();

  return {
    title: 'Penang weekend trip',
    people: [ali, mei, raj, sarah],
    expenses: [
      { id: crypto.randomUUID(), description: 'Airbnb (2 nights)', amountCents: 48000, paidBy: ali.id, splitBetween: all, createdAt: now - 4000 },
      { id: crypto.randomUUID(), description: 'Grab from airport', amountCents: 3850, paidBy: mei.id, splitBetween: all, createdAt: now - 3000 },
      { id: crypto.randomUUID(), description: 'Char kway teow & cendol', amountCents: 6400, paidBy: raj.id, splitBetween: all, createdAt: now - 2000 },
      { id: crypto.randomUUID(), description: 'Penang Hill tickets', amountCents: 12000, paidBy: sarah.id, splitBetween: [ali.id, mei.id, sarah.id], createdAt: now - 1000 },
    ],
  };
}

export function emptyState(): AppState {
  return { title: 'New group', people: [], expenses: [] };
}
