import { describe, expect, it } from 'vitest';
import { fixDigits, parseReceipt, splitQuantity, type OcrLine } from './receipt';

const lines = (...texts: string[]): OcrLine[] => texts.map((text) => ({ text, confidence: 95 }));

describe('receipt parser', () => {
  // This is the real Tesseract output from the sample receipt in the preview
  const sample = parseReceipt([
    ...lines('THE NOODLE CORNER', '12, Jalan Contoh 3, 50000 KL', 'Table 7 Pax 4 12/10/2026 19:42', 'ITEM QTY AMT',
      'Nasi Lemak Ayam 1 14.90', 'Char Kuey Teow 1 12.50', 'Mee Goreng Mamak 1 11.90'),
    { text: 'Roti Canali 2 5.00', confidence: 70 },
    ...lines('Teh Tarik 3 9.60', 'Iced Lemon Tea 1 4.50', 'Satay 10 Sticks 1 18.00', 'SUBTOTAL 76.40',
      'SERVICE CHARGE 10% 7.64', 'SST 6% 5.04', 'ROUNDING 0.02', 'TOTAL 89.10', 'CASH 100.00', 'CHANGE 10.90', 'Thank you! Please come again'),
  ]);

  it('finds every item and nothing else', () => {
    expect(sample.items.map((i) => i.name)).toEqual([
      'Nasi Lemak Ayam', 'Char Kuey Teow', 'Mee Goreng Mamak', 'Roti Canali', 'Teh Tarik', 'Iced Lemon Tea', 'Satay 10 Sticks',
    ]);
    expect(sample.items.reduce((s, i) => s + i.priceCents, 0)).toBe(7640);
  });

  it('reads quantities and flags lines the OCR was unsure about', () => {
    const teh = sample.items.find((i) => i.name === 'Teh Tarik')!;
    expect(teh).toMatchObject({ qty: 3, priceCents: 960, unsure: false });
    expect(sample.items.find((i) => i.name === 'Roti Canali')).toMatchObject({ qty: 2, unsure: true });
    // "10 Sticks" is part of the name, the 1 before the price is the quantity
    expect(sample.items.find((i) => i.name.startsWith('Satay'))!.qty).toBe(1);
  });

  it('picks up service charge, SST, rounding and the totals', () => {
    expect(sample).toMatchObject({ servicePct: 10, sstPct: 6, rounding: true, subtotalCents: 7640, totalCents: 8910 });
  });

  it('handles other common receipt layouts', () => {
    const r = parseReceipt(lines('2 x Roti Canai 5.00', 'Teh Ais x3 7,50', 'Nasi Goreng Kampung RM 12.9O', 'Svc Chg 2.54', 'Service Tax 6% 1.68', 'Grand Total 29.70', 'Visa 29.70'));
    expect(r.items).toEqual([
      { name: 'Roti Canai', qty: 2, priceCents: 500, unsure: false },
      { name: 'Teh Ais', qty: 3, priceCents: 750, unsure: false },
      { name: 'Nasi Goreng Kampung', qty: 1, priceCents: 1290, unsure: false },
    ]);
    expect(r.servicePct).toBe(10); // worked out from RM 2.54 / RM 25.40 since no % was printed
    expect(r.sstPct).toBe(6); // "Service Tax" is SST, not service charge
    expect(r.totalCents).toBe(2970);
  });

  it('returns nothing for a photo with no prices', () => {
    expect(parseReceipt(lines('hello', 'some random text')).items).toEqual([]);
  });
});

describe('helpers', () => {
  it('fixes letter/number mix-ups inside prices only', () => {
    expect(fixDigits('Teh O Ais 12.5O')).toBe('Teh O Ais 12.50');
    expect(fixDigits('Mee 1l.90')).toBe('Mee 11.90');
  });

  it('splits a quantity line without losing a sen', () => {
    const parts = splitQuantity({ name: 'Teh Tarik', qty: 3, priceCents: 1000, unsure: false });
    expect(parts.map((p) => p.priceCents)).toEqual([334, 333, 333]);
    expect(parts.every((p) => p.qty === 1)).toBe(true);
  });
});
