import { useEffect, useRef, useState } from 'react';
import { formatRM, parseRM } from '../lib/money';
import { parseReceipt, splitQuantity, type ScannedItem, type ScannedReceipt } from '../lib/receipt';
import { fileToCanvas, readLines, type OcrProgress } from '../lib/ocr';

export interface ScanResult {
  items: { name: string; priceCents: number }[];
  servicePct: number | null;
  sstPct: number | null;
  rounding: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: (result: ScanResult) => void;
}

/** A row in the review list. Price is kept as typed text so the user can edit it freely. */
interface Row {
  key: number;
  name: string;
  price: string;
  qty: number;
  unsure: boolean;
}

type Step = { kind: 'pick' } | { kind: 'scanning'; preview: string; progress: OcrProgress } | { kind: 'review' } | { kind: 'error'; message: string; detail?: string };

let nextKey = 1;
const toRow = (i: ScannedItem): Row => ({ key: nextKey++, name: i.name, price: (i.priceCents / 100).toFixed(2), qty: i.qty, unsure: i.unsure });

export function ReceiptScanner({ open, onClose, onDone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [rows, setRows] = useState<Row[]>([]);
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null);
  const [rawText, setRawText] = useState('');

  // Open/close the native <dialog> (gives us focus trapping + Esc to close for free)
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setStep({ kind: 'pick' });
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const scan = async (file: File | undefined) => {
    if (!file) return;
    let canvas: HTMLCanvasElement;
    try {
      canvas = await fileToCanvas(file);
    } catch (err) {
      return setStep({ kind: 'error', message: "Couldn't open that image. Try taking the photo again, or pick a JPG/PNG.", detail: String(err) });
    }
    const preview = canvas.toDataURL('image/jpeg', 0.6);
    setStep({ kind: 'scanning', preview, progress: { stage: 'loading', progress: 0 } });
    const onProgress = (progress: OcrProgress) => setStep({ kind: 'scanning', preview, progress });
    try {
      let lines = await readLines(canvas, onProgress);
      let parsed = parseReceipt(lines);
      // Nothing found? Try once more without our contrast boost, which can wash out
      // dark or uneven photos (e.g. a photo of a screen). Keep whichever found more.
      if (parsed.items.length === 0) {
        const retryLines = await readLines(canvas, onProgress, false);
        const retry = parseReceipt(retryLines);
        if (retry.items.length > parsed.items.length) {
          lines = retryLines;
          parsed = retry;
        }
      }
      setReceipt(parsed);
      setRows(parsed.items.map(toRow));
      setRawText(lines.map((l) => `${l.text}   (${Math.round(l.confidence)}% sure)`).join('\n'));
      setStep({ kind: 'review' });
    } catch (err) {
      setStep({
        kind: 'error',
        message: "The scanner couldn't start. Check your internet connection (it's only needed the first time you scan) and try again.",
        detail: String(err),
      });
    }
  };

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, unsure: false } : r)));

  const splitRow = (row: Row) => {
    const parts = splitQuantity({ name: row.name, qty: row.qty, priceCents: parseRM(row.price) ?? 0, unsure: false }).map(toRow);
    setRows((rs) => rs.flatMap((r) => (r.key === row.key ? parts : [r])));
  };

  const valid = rows.filter((r) => r.name.trim() && parseRM(r.price) !== null);
  const sum = valid.reduce((s, r) => s + (parseRM(r.price) ?? 0), 0);
  const receiptSubtotal = receipt?.subtotalCents ?? null;

  const finish = () => {
    if (!receipt) return;
    onDone({
      items: valid.map((r) => ({ name: r.name.trim(), priceCents: parseRM(r.price)! })),
      servicePct: receipt.servicePct,
      sstPct: receipt.sstPct,
      rounding: receipt.rounding,
    });
  };

  const found = receipt
    ? [receipt.servicePct !== null && `${receipt.servicePct}% service charge`, receipt.sstPct !== null && `${receipt.sstPct}% SST`, receipt.rounding && 'rounding'].filter(Boolean)
    : [];

  return (
    <dialog ref={dialog} className="scanner-dialog" onClose={onClose} aria-labelledby="scan-title">
      <div className="scanner-head">
        <h2 id="scan-title">{step.kind === 'review' ? 'Check the items' : 'Scan a receipt'}</h2>
        <button type="button" className="icon-btn small-btn" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      {step.kind === 'pick' && (
        <>
          <p className="muted small">Lay the receipt flat in good light and fit the whole thing in the photo. It's read on your phone, nothing is uploaded.</p>
          <div className="scan-choices">
            <label className="scan-choice">
              <span aria-hidden="true">📷</span>
              <b>Take a photo</b>
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => scan(e.target.files?.[0])} />
            </label>
            <label className="scan-choice">
              <span aria-hidden="true">🖼️</span>
              <b>Choose from gallery</b>
              <input type="file" accept="image/*" hidden onChange={(e) => scan(e.target.files?.[0])} />
            </label>
          </div>
        </>
      )}

      {step.kind === 'scanning' && (
        <div className="scanning">
          <div className="scan-preview">
            <img src={step.preview} alt="Your receipt" />
            <div className="scanline" />
          </div>
          <div className="scan-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(step.progress.progress * 100)}>
            <div style={{ width: `${(step.progress.stage === 'loading' ? step.progress.progress * 0.3 : 0.3 + step.progress.progress * 0.7) * 100}%` }} />
          </div>
          <p className="muted small center" aria-live="polite">
            {step.progress.stage === 'loading' ? 'Getting the scanner ready (first time only)…' : `Reading the receipt… ${Math.round(step.progress.progress * 100)}%`}
          </p>
        </div>
      )}

      {step.kind === 'error' && (
        <>
          <p className="error">{step.message}</p>
          {step.detail && <p className="small muted">Details: {step.detail}</p>}
          <button type="button" className="btn" onClick={() => setStep({ kind: 'pick' })}>
            Try again
          </button>
        </>
      )}

      {step.kind === 'review' && (
        <>
          {rows.length === 0 ? (
            <p className="notice warn">
              No items found. Try again with the receipt flat, in good light and filling most of the photo, or add the items below.
            </p>
          ) : (
            <p className="muted small">
              Fix anything it got wrong. <span className="unsure-key">Yellow</span> = it wasn't sure.
            </p>
          )}

          <div className="scan-rows">
            {rows.map((r) => (
              <div className="scan-row" key={r.key}>
                <input className={r.unsure ? 'unsure' : ''} value={r.name} aria-label="Item name" placeholder="Item" onChange={(e) => update(r.key, { name: e.target.value })} />
                <input className={`price ${r.unsure ? 'unsure' : ''}`} value={r.price} inputMode="decimal" aria-label="Price" placeholder="0.00" onChange={(e) => update(r.key, { price: e.target.value })} />
                <button type="button" className="icon-btn small-btn" aria-label={`Remove ${r.name || 'item'}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  ×
                </button>
                {r.qty > 1 && (
                  <div className="scan-qty small muted">
                    × {r.qty} on the receipt ·{' '}
                    <button type="button" className="link small" onClick={() => splitRow(r)}>
                      split into {r.qty} lines
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="link small" onClick={() => setRows((rs) => [...rs, { key: nextKey++, name: '', price: '', qty: 1, unsure: false }])}>
            + Add a missing item
          </button>

          <div className={`scan-check ${receiptSubtotal === null ? '' : receiptSubtotal === sum ? 'ok' : 'warn'}`}>
            <span>Items add up to {formatRM(sum)}</span>
            <span>
              {receiptSubtotal === null
                ? 'no subtotal found to compare'
                : receiptSubtotal === sum
                  ? '✓ matches the receipt'
                  : `⚠ receipt says ${formatRM(receiptSubtotal)}`}
            </span>
          </div>
          {found.length > 0 && <p className="small muted">Also found: {found.join(', ')}. These get ticked for you.</p>}

          <details className="raw-text small">
            <summary>What the scanner read</summary>
            <pre>{rawText}</pre>
          </details>

          <div className="scanner-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setStep({ kind: 'pick' })}>
              Scan again
            </button>
            <button type="button" className="btn" disabled={valid.length === 0} onClick={finish}>
              Use {valid.length} item{valid.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
