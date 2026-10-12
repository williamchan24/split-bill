/**
 * Reads text off a photo, entirely in the browser, with Tesseract.js.
 * The photo never leaves the device. The OCR engine (~7 MB) is only downloaded
 * the first time someone scans, then the browser caches it.
 */
import type { Worker } from 'tesseract.js';
import type { OcrLine } from './receipt';

export interface OcrProgress {
  stage: 'loading' | 'reading';
  progress: number; // 0–1
}

let workerPromise: Promise<Worker> | null = null;

/** The OCR files are served from our own site (see vite.config.ts), not a CDN. */
const ocrUrl = (file = '') => new URL(`ocr/${file}`, document.baseURI).href;

let report: (p: OcrProgress) => void = () => {};

function getWorker(): Promise<Worker> {
  workerPromise ??= (async () => {
    // Dynamic import = the OCR library isn't in the main bundle, so the app still loads fast
    const { createWorker } = await import('tesseract.js');
    return createWorker('eng', 1, {
      workerPath: ocrUrl('worker.min.js'),
      corePath: ocrUrl(),
      langPath: ocrUrl(),
      logger: (m) => {
        if (m.status === 'recognizing text') report({ stage: 'reading', progress: m.progress });
        else if (typeof m.progress === 'number') report({ stage: 'loading', progress: m.progress });
      },
    });
  })().catch((err) => {
    workerPromise = null; // let the user try again (e.g. they were offline)
    throw err;
  });
  return workerPromise;
}

/** Load a photo File into a canvas. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

/**
 * Clean the photo up for OCR: shrink huge phone photos, greyscale, boost contrast.
 * Receipts are faint thermal print, so this makes a big difference.
 */
export function prepareForOcr(source: HTMLCanvasElement, maxWidth = 1600): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / source.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const grey = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (grey - 128) * 1.6 + 140));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Read every line of text on the image, with how confident the OCR was. */
export async function readLines(source: HTMLCanvasElement, onProgress: (p: OcrProgress) => void): Promise<OcrLine[]> {
  report = onProgress;
  onProgress({ stage: 'loading', progress: 0 });
  const worker = await getWorker();
  const { data } = await worker.recognize(prepareForOcr(source), {}, { blocks: true });
  const lines = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
  return lines.map((l) => ({ text: l.text.trim(), confidence: l.confidence })).filter((l) => l.text.length > 0);
}
