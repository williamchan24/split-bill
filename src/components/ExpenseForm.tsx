import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Charges, Expense, Item, Person } from '../types';
import { formatRM, parseRM } from '../lib/money';
import { allocate, applyCharges, hasCharges, itemTotals } from '../lib/bill';
import { ChargesPicker, type ChargesForm } from './ChargesPicker';

interface Props {
  people: Person[];
  onAdd: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
}

interface ItemRow {
  id: string;
  name: string;
  price: string; // what's typed, e.g. "12.50"
  sharedBy: string[];
}

const newItem = (sharedBy: string[] = []): ItemRow => ({ id: crypto.randomUUID(), name: '', price: '', sharedBy });

const DEFAULT_CHARGES: ChargesForm = { service: false, servicePct: '10', sst: false, sstPct: '6', round5: false };

/** Turn the checkboxes + typed percentages into numbers (unticked = 0%) */
function toCharges(c: ChargesForm): Charges {
  const pct = (on: boolean, v: string) => (on ? Math.max(0, parseFloat(v) || 0) : 0);
  return { servicePct: pct(c.service, c.servicePct), sstPct: pct(c.sst, c.sstPct), round5: c.round5 };
}

export function ExpenseForm({ people, onAdd }: Props) {
  const [description, setDescription] = useState('');
  const [itemised, setItemised] = useState(false);
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState<ItemRow[]>(() => [newItem()]);
  const [charges, setCharges] = useState<ChargesForm>(DEFAULT_CHARGES);
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [error, setError] = useState('');

  const ids = useMemo(() => people.map((p) => p.id), [people]);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? '?';

  // Keep the form in sync when people are added/removed: default to "everyone".
  useEffect(() => {
    setPaidBy((current) => (ids.includes(current) ? current : (ids[0] ?? '')));
    setSplitBetween(ids);
    setItems((rows) => rows.map((r) => ({ ...r, sharedBy: r.sharedBy.filter((id) => ids.includes(id)) })));
  }, [ids]);

  // ---------- Live numbers for the preview ----------
  const parsedItems: Item[] = items
    .map((r) => ({ id: r.id, name: r.name.trim(), priceCents: parseRM(r.price) ?? 0, sharedBy: r.sharedBy }))
    .filter((it) => it.priceCents > 0 && it.sharedBy.length > 0);
  const chargeValues = toCharges(charges);
  const subtotal = itemised ? parsedItems.reduce((sum, it) => sum + it.priceCents, 0) : (parseRM(amount) ?? 0);
  const bill = applyCharges(subtotal, chargeValues);

  // Per-person preview for itemised bills
  const itemSharers = ids.filter((id) => parsedItems.some((it) => it.sharedBy.includes(id)));
  const food = itemTotals(parsedItems, itemSharers);
  const extras = allocate(bill.total - subtotal, itemSharers.map((id) => food.get(id)!));

  if (people.length < 2) return null;

  // ---------- Helpers ----------
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const updateItem = (id: string, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const reset = () => {
    setDescription('');
    setAmount('');
    setItems([newItem()]);
    setError('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setError('What was it for?');

    const extra = hasCharges(chargeValues) ? { subtotalCents: subtotal, charges: chargeValues } : {};

    if (itemised) {
      const filled = items.filter((r) => r.name.trim() || r.price.trim());
      if (filled.length === 0) return setError('Add at least one item.');
      for (const [i, r] of filled.entries()) {
        const label = r.name.trim() || `Item ${i + 1}`;
        if (parseRM(r.price) === null) return setError(`${label}: enter a price like 12.50`);
        if (r.sharedBy.length === 0) return setError(`${label}: tap who had it.`);
      }
      const finalItems: Item[] = filled.map((r, i) => ({
        id: r.id,
        name: r.name.trim() || `Item ${i + 1}`,
        priceCents: parseRM(r.price)!,
        // keep people-list order (decides who gets any leftover sen)
        sharedBy: ids.filter((id) => r.sharedBy.includes(id)),
      }));
      const everyone = ids.filter((id) => finalItems.some((it) => it.sharedBy.includes(id)));
      onAdd({ description: description.trim(), amountCents: bill.total, paidBy, splitBetween: everyone, items: finalItems, ...extra });
      return reset();
    }

    if (parseRM(amount) === null) return setError(hasCharges(chargeValues) ? 'Enter the subtotal, like 25 or 12.50' : 'Enter an amount like 25 or 12.50');
    if (splitBetween.length === 0) return setError('Pick at least one person to split with.');
    const ordered = ids.filter((id) => splitBetween.includes(id));
    onAdd({ description: description.trim(), amountCents: bill.total, paidBy, splitBetween: ordered, ...extra });
    reset();
  };

  const paidBySelect = (
    <label>
      Paid by
      <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="card">
      <h2>Add an expense</h2>
      <form className="stack" onSubmit={submit}>
        <label>
          What for
          <input value={description} maxLength={60} placeholder="e.g. Nasi lemak breakfast" onChange={(e) => setDescription(e.target.value)} />
        </label>

        {/* One amount vs itemised */}
        <div className="segmented" role="group" aria-label="How to split">
          <button type="button" className={!itemised ? 'on' : ''} aria-pressed={!itemised} onClick={() => setItemised(false)}>
            One amount
          </button>
          <button type="button" className={itemised ? 'on' : ''} aria-pressed={itemised} onClick={() => setItemised(true)}>
            Itemised
          </button>
        </div>

        {!itemised ? (
          <>
            <div className="row">
              <label>
                {hasCharges(chargeValues) ? 'Subtotal (RM)' : 'Amount (RM)'}
                <input inputMode="decimal" value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
              </label>
              {paidBySelect}
            </div>

            <fieldset>
              <legend>
                Split between
                <button type="button" className="link" onClick={() => setSplitBetween(ids)}>
                  everyone
                </button>
              </legend>
              <div className="chips">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip toggle ${splitBetween.includes(p.id) ? 'on' : ''}`}
                    aria-pressed={splitBetween.includes(p.id)}
                    onClick={() => setSplitBetween((prev) => toggle(prev, p.id))}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <>
            <fieldset>
              <legend>Items · tap who had each one</legend>
              <div className="items">
                {items.map((r, i) => (
                  <div className="item" key={r.id}>
                    <div className="item-top">
                      <input value={r.name} maxLength={40} placeholder={`Item ${i + 1}`} aria-label={`Item ${i + 1} name`} onChange={(e) => updateItem(r.id, { name: e.target.value })} />
                      <input inputMode="decimal" value={r.price} placeholder="0.00" aria-label={`Item ${i + 1} price`} onChange={(e) => updateItem(r.id, { price: e.target.value })} />
                      <button
                        type="button"
                        className="icon-btn small-btn"
                        aria-label={`Remove item ${i + 1}`}
                        disabled={items.length === 1}
                        onClick={() => setItems((rows) => rows.filter((x) => x.id !== r.id))}
                      >
                        ×
                      </button>
                    </div>
                    <div className="chips">
                      {people.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`chip toggle small-chip ${r.sharedBy.includes(p.id) ? 'on' : ''}`}
                          aria-pressed={r.sharedBy.includes(p.id)}
                          onClick={() => updateItem(r.id, { sharedBy: toggle(r.sharedBy, p.id) })}
                        >
                          {p.name}
                        </button>
                      ))}
                      <button type="button" className="link small" onClick={() => updateItem(r.id, { sharedBy: ids })}>
                        shared by all
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-ghost add-item" onClick={() => setItems((rows) => [...rows, newItem()])}>
                + Add item
              </button>
            </fieldset>
            {paidBySelect}
          </>
        )}

        <ChargesPicker value={charges} onChange={setCharges} />

        {/* Live receipt preview */}
        {subtotal > 0 && (hasCharges(chargeValues) || itemised) && (
          <div className="receipt" aria-live="polite">
            <div>
              <span>Subtotal</span>
              <span>{formatRM(bill.subtotal)}</span>
            </div>
            {bill.service > 0 && (
              <div className="dim">
                <span>Service {chargeValues.servicePct}%</span>
                <span>{formatRM(bill.service)}</span>
              </div>
            )}
            {bill.sst > 0 && (
              <div className="dim">
                <span>SST {chargeValues.sstPct}%</span>
                <span>{formatRM(bill.sst)}</span>
              </div>
            )}
            {bill.rounding !== 0 && (
              <div className="dim">
                <span>Rounding</span>
                <span>
                  {bill.rounding > 0 ? '+' : '−'}
                  {formatRM(Math.abs(bill.rounding))}
                </span>
              </div>
            )}
            <div className="receipt-total">
              <span>Total</span>
              <span>{formatRM(bill.total)}</span>
            </div>
            {itemised && itemSharers.length > 0 && (
              <div className="receipt-shares">
                {itemSharers.map((id, i) => (
                  <div key={id}>
                    <span>{nameOf(id)}</span>
                    <span>{formatRM(food.get(id)! + extras[i])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          Add expense
        </button>
      </form>
    </section>
  );
}
