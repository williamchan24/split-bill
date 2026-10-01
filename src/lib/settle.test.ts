import { describe, expect, it } from 'vitest';
import { computeBalances, settleUp } from './settle';
import { formatRM, parseRM, splitEvenly } from './money';
import type { Expense } from '../types';

const expense = (paidBy: string, amountCents: number, splitBetween: string[]): Expense => ({
  id: Math.random().toString(),
  description: 'test',
  amountCents,
  paidBy,
  splitBetween,
  createdAt: 0,
});

describe('money helpers', () => {
  it('parses ringgit input into cents', () => {
    expect(parseRM('12.5')).toBe(1250);
    expect(parseRM('RM 1,200.00')).toBe(120000);
    expect(parseRM('0')).toBeNull();
    expect(parseRM('abc')).toBeNull();
    expect(parseRM('1.234')).toBeNull();
  });

  it('formats cents as ringgit', () => {
    expect(formatRM(1250)).toBe('RM 12.50');
  });

  it('splits evenly without losing a single sen', () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEvenly(1000, 3).reduce((a, b) => a + b)).toBe(1000);
  });
});

describe('settling up', () => {
  it('computes balances that always sum to zero', () => {
    const balances = computeBalances(['a', 'b', 'c'], [
      expense('a', 9000, ['a', 'b', 'c']),
      expense('b', 1000, ['a', 'b', 'c']),
    ]);
    expect([...balances.values()].reduce((x, y) => x + y)).toBe(0);
    expect(balances.get('a')).toBe(9000 - 3000 - 334);
  });

  it('produces payments that zero everyone out', () => {
    const balances = computeBalances(['a', 'b', 'c', 'd'], [
      expense('a', 12000, ['a', 'b', 'c', 'd']),
      expense('b', 4000, ['b', 'c']),
      expense('d', 999, ['a', 'd']),
    ]);
    const transfers = settleUp(balances);
    const after = new Map(balances);
    for (const t of transfers) {
      after.set(t.from, after.get(t.from)! + t.amountCents);
      after.set(t.to, after.get(t.to)! - t.amountCents);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
    expect(transfers.length).toBeLessThanOrEqual(3);
  });

  it('returns no payments when everyone is even', () => {
    expect(settleUp(computeBalances(['a', 'b'], []))).toEqual([]);
  });
});
