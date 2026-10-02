import type { Charges, Expense, Item } from '../types';
import { splitEvenly } from './money';

export const NO_CHARGES: Charges = { servicePct: 0, sstPct: 0, round5: false };

export interface Breakdown {
  subtotal: number;
  service: number;
  sst: number;
  rounding: number; // can be negative
  total: number;
}

/**
 * Work out a receipt the way Malaysian restaurants usually do:
 * service charge on the subtotal, then SST on (subtotal + service charge),
 * then optionally round the total to the nearest 5 sen.
 */
export function applyCharges(subtotal: number, charges: Charges): Breakdown {
  const service = Math.round((subtotal * charges.servicePct) / 100);
  const sst = Math.round(((subtotal + service) * charges.sstPct) / 100);
  const beforeRounding = subtotal + service + sst;
  const total = charges.round5 ? Math.round(beforeRounding / 5) * 5 : beforeRounding;
  return { subtotal, service, sst, rounding: total - beforeRounding, total };
}

export const hasCharges = (c?: Charges) => !!c && (c.servicePct > 0 || c.sstPct > 0 || c.round5);

/**
 * Split `total` sen across people in proportion to `weights`, adding up EXACTLY to the total.
 * Uses the largest-remainder method: everyone gets the rounded-down share, then the leftover
 * sen go to whoever was closest to the next sen. allocate(100, [1, 1, 1]) → [34, 33, 33]
 */
export function allocate(total: number, weights: number[]): number[] {
  if (total < 0) return allocate(-total, weights).map((x) => -x);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left-- <= 0) break;
    out[i]++;
  }
  return out;
}

/** How much of the food each person had on an itemised bill (shared items split evenly). */
export function itemTotals(items: Item[], personIds: string[]): Map<string, number> {
  const totals = new Map<string, number>(personIds.map((id) => [id, 0]));
  for (const item of items) {
    const sharers = personIds.filter((id) => item.sharedBy.includes(id));
    splitEvenly(item.priceCents, sharers.length).forEach((share, i) => {
      totals.set(sharers[i], totals.get(sharers[i])! + share);
    });
  }
  return totals;
}

/**
 * What each person owes for one expense, in cents. Always adds up to expense.amountCents.
 * - Itemised: your items + a share of the charges proportional to what you had.
 * - Otherwise: the total split evenly.
 */
export function expenseShares(expense: Expense): Map<string, number> {
  const ids = expense.splitBetween;

  if (expense.items?.length) {
    const food = itemTotals(expense.items, ids);
    const foodTotal = [...food.values()].reduce((a, b) => a + b, 0);
    const extra = allocate(expense.amountCents - foodTotal, ids.map((id) => food.get(id)!));
    return new Map(ids.map((id, i) => [id, food.get(id)! + extra[i]]));
  }

  const shares = splitEvenly(expense.amountCents, ids.length);
  return new Map(ids.map((id, i) => [id, shares[i]]));
}
