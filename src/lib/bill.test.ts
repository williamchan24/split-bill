import { describe, expect, it } from 'vitest';
import { allocate, applyCharges, expenseShares } from './bill';
import { computeBalances } from './settle';
import type { Expense } from '../types';

describe('service charge + SST', () => {
  it('adds service on the subtotal, then SST on top', () => {
    // RM 100 → +RM 10 service → +RM 6.60 SST (6% of 110) = RM 116.60
    expect(applyCharges(10000, { servicePct: 10, sstPct: 6, round5: false })).toEqual({
      subtotal: 10000, service: 1000, sst: 660, rounding: 0, total: 11660,
    });
  });

  it('rounds to the nearest 5 sen when asked', () => {
    const b = applyCharges(18640, { servicePct: 10, sstPct: 6, round5: true });
    expect(b.total % 5).toBe(0);
    expect(b.total).toBe(21735);
    expect(b.rounding).toBe(1);
  });

  it('does nothing with no charges', () => {
    expect(applyCharges(1234, { servicePct: 0, sstPct: 0, round5: false }).total).toBe(1234);
  });
});

describe('allocate', () => {
  it('always adds up exactly', () => {
    const parts = allocate(1829, [3557, 2917, 790, 3756]);
    expect(parts.reduce((a, b) => a + b)).toBe(1829);
  });
  it('handles negative amounts (rounding down)', () => {
    expect(allocate(-2, [1, 1, 1]).reduce((a, b) => a + b)).toBe(-2);
  });
});

describe('itemised bills', () => {
  const bill: Expense = {
    id: 'x', description: 'Dinner', paidBy: 'a', createdAt: 0,
    splitBetween: ['a', 'b', 'c'],
    amountCents: applyCharges(6000, { servicePct: 10, sstPct: 6, round5: false }).total, // 6996
    charges: { servicePct: 10, sstPct: 6, round5: false },
    subtotalCents: 6000,
    items: [
      { id: '1', name: 'Steak', priceCents: 3000, sharedBy: ['a'] },
      { id: '2', name: 'Pasta', priceCents: 1500, sharedBy: ['b'] },
      { id: '3', name: 'Fries', priceCents: 1500, sharedBy: ['a', 'b', 'c'] },
    ],
  };

  it('charges each person for their items plus a proportional share of charges', () => {
    const shares = expenseShares(bill);
    // food: a 3500, b 2000, c 500 → each × 1.166
    expect(shares.get('a')).toBe(4081);
    expect(shares.get('b')).toBe(2332);
    expect(shares.get('c')).toBe(583);
    expect([...shares.values()].reduce((x, y) => x + y)).toBe(bill.amountCents);
  });

  it('keeps balances summing to zero', () => {
    const balances = computeBalances(['a', 'b', 'c'], [bill]);
    expect([...balances.values()].reduce((x, y) => x + y)).toBe(0);
    expect(balances.get('a')).toBe(6996 - 4081);
  });
});
