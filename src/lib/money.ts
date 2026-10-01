const formatter = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' });

/** 1250 → "RM 12.50" */
export function formatRM(cents: number): string {
  return formatter.format(cents / 100).replace(/ /g, ' ');
}

/** "12.5" / "RM12.50" / "1,200" → cents, or null if invalid / not positive */
export function parseRM(input: string): number | null {
  const cleaned = input.replace(/rm/i, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return cents > 0 ? cents : null;
}

/**
 * Split an amount into `parts` shares that add up EXACTLY to the total.
 * The leftover sen go to the first people: RM 10.00 / 3 → [334, 333, 333]
 */
export function splitEvenly(totalCents: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
