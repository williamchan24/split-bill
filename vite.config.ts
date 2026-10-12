import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

/**
 * The receipt scanner's OCR engine files, served from our own site at /ocr/
 * instead of a third-party CDN. They're copied out of node_modules at build time,
 * so nothing big needs to be committed to git.
 */
const OCR_FILES: Record<string, string> = {
  'worker.min.js': join(pkgDir('tesseract.js'), 'dist/worker.min.js'),
  // The browser downloads only ONE of these three, whichever its CPU supports best
  'tesseract-core-relaxedsimd-lstm.wasm.js': join(pkgDir('tesseract.js-core'), 'tesseract-core-relaxedsimd-lstm.wasm.js'),
  'tesseract-core-simd-lstm.wasm.js': join(pkgDir('tesseract.js-core'), 'tesseract-core-simd-lstm.wasm.js'),
  'tesseract-core-lstm.wasm.js': join(pkgDir('tesseract.js-core'), 'tesseract-core-lstm.wasm.js'),
  // English "fast + accurate" model, about 3 MB
  'eng.traineddata.gz': join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int/eng.traineddata.gz'),
};

function selfHostOcr(): Plugin {
  return {
    name: 'self-host-ocr',
    // `npm run dev`: answer /ocr/... requests straight from node_modules
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = req.url?.match(/\/ocr\/([^?]+)/)?.[1];
        if (!file || !OCR_FILES[file]) return next();
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
        createReadStream(OCR_FILES[file]).pipe(res);
      });
    },
    // `npm run build`: copy them into dist/ocr/
    generateBundle() {
      for (const [name, path] of Object.entries(OCR_FILES)) {
        this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(path) });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), selfHostOcr()],
  // './' = relative paths, so the built app works in ANY folder,
  // e.g. williamchan24.github.io/split-bill/
  base: './',
});
