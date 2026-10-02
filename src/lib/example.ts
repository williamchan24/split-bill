import type { AppState } from '../types';
import { applyCharges } from './bill';

/** Demo data shown on first visit, so the app isn't empty when people open it. */
export function exampleState(): AppState {
  const [p1, p2, p3, p4] = ['Person 1', 'Person 2', 'Person 3', 'Person 4'].map((name) => ({
    id: crypto.randomUUID(),
    name,
  }));
  const all = [p1.id, p2.id, p3.id, p4.id];
  const now = Date.now();

  // An itemised dinner with 10% service charge + 6% SST, to show off the itemised split
  const dinnerItems = [
    { id: crypto.randomUUID(), name: 'Nasi lemak rendang', priceCents: 2490, sharedBy: [p1.id] },
    { id: crypto.randomUUID(), name: 'Char kuey teow', priceCents: 1850, sharedBy: [p2.id] },
    { id: crypto.randomUUID(), name: 'Satay (sharing)', priceCents: 3200, sharedBy: [p1.id, p2.id, p4.id] },
    { id: crypto.randomUUID(), name: 'Chicken chop', priceCents: 2690, sharedBy: [p4.id] },
    { id: crypto.randomUUID(), name: 'Iced lemon tea', priceCents: 790, sharedBy: [p3.id] },
  ];
  const dinnerCharges = { servicePct: 10, sstPct: 6, round5: false };
  const dinnerSubtotal = dinnerItems.reduce((sum, it) => sum + it.priceCents, 0);

  return {
    title: 'Split Bill',
    people: [p1, p2, p3, p4],
    expenses: [
      {
        id: crypto.randomUUID(),
        description: 'Dinner',
        amountCents: applyCharges(dinnerSubtotal, dinnerCharges).total,
        paidBy: p1.id,
        splitBetween: all,
        createdAt: now - 4000,
        subtotalCents: dinnerSubtotal,
        charges: dinnerCharges,
        items: dinnerItems,
      },
      { id: crypto.randomUUID(), description: 'Groceries', amountCents: 8650, paidBy: p2.id, splitBetween: all, createdAt: now - 3000 },
      { id: crypto.randomUUID(), description: 'Taxi', amountCents: 3200, paidBy: p3.id, splitBetween: all, createdAt: now - 2000 },
      { id: crypto.randomUUID(), description: 'Movie tickets', amountCents: 6000, paidBy: p4.id, splitBetween: [p1.id, p2.id, p4.id], createdAt: now - 1000 },
    ],
  };
}

export function emptyState(): AppState {
  return { title: 'New group', people: [], expenses: [] };
}
