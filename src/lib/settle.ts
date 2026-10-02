import type { Expense, Transfer } from '../types';
import { expenseShares } from './bill';

/**
 * Net balance per person, in cents.
 * Positive = the group owes them money. Negative = they owe the group.
 */
export function computeBalances(personIds: string[], expenses: Expense[]): Map<string, number> {
  const balances = new Map<string, number>(personIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    const sharers = expense.splitBetween.filter((id) => balances.has(id));
    if (!balances.has(expense.paidBy) || sharers.length === 0) continue;

    balances.set(expense.paidBy, balances.get(expense.paidBy)! + expense.amountCents);
    // Each person's share: an even split, or their items + charges if the bill is itemised
    for (const [id, share] of expenseShares({ ...expense, splitBetween: sharers })) {
      balances.set(id, balances.get(id)! - share);
    }
  }

  return balances;
}

/**
 * Turn balances into a short list of payments that settles everyone up.
 * Greedy approach: the person who owes the most pays the person owed the most,
 * repeat until everyone is at zero. Produces at most (people - 1) transfers.
 */
export function settleUp(balances: Map<string, number>): Transfer[] {
  const debtors = [...balances].filter(([, b]) => b < 0).map(([id, b]) => ({ id, amount: -b }));
  const creditors = [...balances].filter(([, b]) => b > 0).map(([id, b]) => ({ id, amount: b }));
  const transfers: Transfer[] = [];

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].amount, creditors[c].amount);
    transfers.push({ from: debtors[d].id, to: creditors[c].id, amountCents: pay });
    debtors[d].amount -= pay;
    creditors[c].amount -= pay;
    if (debtors[d].amount === 0) d++;
    if (creditors[c].amount === 0) c++;
  }

  return transfers;
}
