export interface Person {
  id: string;
  name: string;
}

/** Extra charges on a bill, e.g. a restaurant receipt */
export interface Charges {
  servicePct: number; // 0 = no service charge
  sstPct: number; // 0 = no SST
  round5: boolean; // round the total to the nearest 5 sen, like Malaysian receipts
}

/** One line on an itemised receipt */
export interface Item {
  id: string;
  name: string;
  priceCents: number;
  sharedBy: string[]; // Person ids who had this item
}

export interface Expense {
  id: string;
  description: string;
  /** The FINAL amount paid (after any charges), in cents (sen) to avoid floating-point bugs: RM 12.50 → 1250 */
  amountCents: number;
  paidBy: string; // Person id
  splitBetween: string[]; // Person ids
  createdAt: number;
  /** Optional: the amount before charges, and which charges were added */
  subtotalCents?: number;
  charges?: Charges;
  /** Optional: itemised bill. Each person pays for their items + their share of the charges */
  items?: Item[];
}

export interface Transfer {
  from: string; // Person id
  to: string; // Person id
  amountCents: number;
}

export interface AppState {
  title: string;
  people: Person[];
  expenses: Expense[];
}
