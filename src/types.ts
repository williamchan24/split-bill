export interface Person {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  /** Stored in cents (sen) to avoid floating-point rounding bugs: RM 12.50 → 1250 */
  amountCents: number;
  paidBy: string; // Person id
  splitBetween: string[]; // Person ids
  createdAt: number;
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
