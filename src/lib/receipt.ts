/**
 * Turns the text the OCR read off a receipt into items, prices and charges.
 * Pure functions (no browser stuff) so they're easy to unit test.
 */

export interface OcrLine {
  text: string;
  confidence: number; // 0–100, how sure the OCR was about this line
}

export interface ScannedItem {
  name: string;
  qty: number;
  priceCents: number; // line total, e.g. 3 × Teh Tarik = 960
  unsure: boolean; // OCR wasn't confident, so flag it for the user to check
}

export interface ScannedReceipt {
  items: ScannedItem[];
  servicePct: number | null; // null = no service charge found
  sstPct: number | null; // null = no SST found
  rounding: boolean;
  subtotalCents: number | null; // what the receipt says, for the "does it add up?" check
  totalCents: number | null;
}

const UNSURE_BELOW = 75;

/** Lines that have a price but aren't food: payment, totals, receipt details… */
const NOT_AN_ITEM =
  /\b(sub\s?total|total|amount|cash|change|balance|tender|visa|master|card|debit|credit|qr|e-?wallet|tng|grab|duitnow|invoice|inv|receipt|bill no|table|pax|date|time|cashier|thank|welcome|tel|phone|reg|item\s+qty|qty|discount|voucher|deposit)\b/i;

/** A price at the end of a line: 12.50 / 12,50 / -1.00 */
const PRICE_AT_END = /(-?\d{1,5}[.,]\d{2})\s*$/;

/** Fix the classic OCR mix-ups inside numbers: O→0, l/I→1 (only right next to digits). */
export function fixDigits(text: string): string {
  return text
    .replace(/(?<=\d)[oO](?=\d|[.,]|$)|(?<=[.,]\d?)[oO]/g, '0')
    .replace(/(?<=\d)[lI](?=\d|[.,])/g, '1')
    .replace(/\s+/g, ' ')
    .trim();
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export function parseReceipt(lines: OcrLine[]): ScannedReceipt {
  const out: ScannedReceipt = { items: [], servicePct: null, sstPct: null, rounding: false, subtotalCents: null, totalCents: null };
  let serviceAmount: number | null = null;
  let sstAmount: number | null = null;
  let serviceFound = false;
  let sstFound = false;

  for (const { text, confidence } of lines) {
    const t = fixDigits(text);
    const low = t.toLowerCase();
    const priceMatch = t.match(PRICE_AT_END);
    const amount = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '.')) * 100) : null;
    const pctMatch = low.match(/(\d{1,2}(?:\.\d)?)\s?%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]) : null;

    // Charges first. "Service Tax" is SST in Malaysia; "Service Charge" is the tip-like 10%.
    if (/service\s*(charge|chg)|\bsvc\b|\bs\/c\b/.test(low)) {
      serviceFound = true;
      out.servicePct = pct;
      serviceAmount = amount;
      continue;
    }
    if (/\b(sst|gst|service tax|sales tax|tax)\b/.test(low)) {
      sstFound = true;
      out.sstPct = pct;
      sstAmount = amount;
      continue;
    }
    if (/round/.test(low)) {
      out.rounding = true;
      continue;
    }
    if (/sub\s?-?total/.test(low)) {
      out.subtotalCents = amount;
      continue;
    }
    if (/\btotal\b/.test(low)) {
      out.totalCents ??= amount;
      continue;
    }
    if (!priceMatch || !amount || amount <= 0 || NOT_AN_ITEM.test(low)) continue;

    // What's left before the price is "name" and maybe a quantity
    let rest = t.slice(0, priceMatch.index).replace(/\s*rm\s*$/i, '').trim();
    let qty = 1;
    const qtyFirst = rest.match(/^(\d{1,2})\s?[x×*]\s*(.+)$/i); // "2 x Roti Canai"
    const qtyLast = rest.match(/^(.*?)\s+(?:x\s?)?(\d{1,2})$/i); // "Roti Canai 2" / "Roti Canai x2"
    if (qtyFirst) {
      qty = Number(qtyFirst[1]);
      rest = qtyFirst[2];
    } else if (qtyLast && /[a-z]/i.test(qtyLast[1])) {
      qty = Number(qtyLast[2]);
      rest = qtyLast[1];
    }
    const name = rest.replace(/[^\w\s()&'\-/.]/g, '').replace(/\s+/g, ' ').trim();
    if ((name.match(/[a-z]/gi) ?? []).length < 2) continue; // probably noise, not a dish

    out.items.push({ name: titleCase(name), qty: Math.max(1, qty), priceCents: amount, unsure: confidence < UNSURE_BELOW });
  }

  // If the % itself wasn't readable, work it out from the amounts
  const itemsTotal = out.items.reduce((sum, i) => sum + i.priceCents, 0);
  const base = out.subtotalCents ?? itemsTotal;
  if (serviceFound && out.servicePct === null && serviceAmount && base) {
    out.servicePct = Math.round((serviceAmount / base) * 100);
  }
  if (sstFound && out.sstPct === null && sstAmount && base) {
    out.sstPct = Math.round((sstAmount / (base + (serviceAmount ?? 0))) * 100);
  }
  return out;
}

/** Split "Teh Tarik × 3 = RM 9.60" into three RM 3.20 lines (leftover sen go to the first ones). */
export function splitQuantity(item: ScannedItem): ScannedItem[] {
  const base = Math.floor(item.priceCents / item.qty);
  const extra = item.priceCents - base * item.qty;
  return Array.from({ length: item.qty }, (_, i) => ({ ...item, qty: 1, priceCents: base + (i < extra ? 1 : 0) }));
}
