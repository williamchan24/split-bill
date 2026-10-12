# SplitBill 🧾

Split group expenses without the awkward maths. Add who's in, log who paid for what, and SplitBill works out the **fewest payments** needed to settle up. Then copy a summary straight into your WhatsApp group.

**Live:** https://www.williamchanwinghong.com/projects/split-bill/

## Features
- Add people and expenses in RM, and split each expense with everyone or only some people
- **Service charge + SST:** tick to add 10% service / 6% SST (editable), with optional rounding to the nearest 5 sen
- **📷 Receipt scanner:** take a photo of the bill and it reads the items, prices, service charge and SST for you. It runs entirely on your phone (on-device OCR), so the photo is never uploaded
- **Itemised bills:** add each item, tag who had it (shared dishes too), and everyone pays for their own items plus a fair share of the charges
- Live balances showing who's owed and who owes
- **Settle up:** the minimum number of payments to clear everyone, at most *people − 1*
- One-click summary you can paste into WhatsApp
- Saves automatically in your browser, so nothing is uploaded
- Dark mode, mobile friendly

## How it works
- **Money is stored in sen (integers), not floats.** `0.1 + 0.2` in JavaScript is `0.30000000000000004`, so all maths uses whole cents. When an amount doesn't divide evenly, e.g. RM 10 between 3 people, the leftover sen goes to the first people, giving 3.34 / 3.33 / 3.33, so the total always adds up exactly.
- **Settling up:** each person's net balance is `paid − share`. A greedy algorithm repeatedly matches the person who owes the most with the person owed the most, which keeps the number of transfers small.
- **Charges:** service charge is applied to the subtotal, then SST on (subtotal + service), like most Malaysian receipts. On itemised bills the charges are shared in proportion to what each person ordered, using the largest-remainder method so every sen is accounted for.
- **Receipt scanning:** [Tesseract.js](https://github.com/naptha/tesseract.js) reads the text in the browser. The photo is shrunk, greyscaled and contrast-boosted first, then `src/lib/receipt.ts` picks out item lines, quantities, service charge ("Service Tax" is treated as SST) and the subtotal, so the app can check the items add up. Lines the OCR wasn't sure about are highlighted for the user to check. The OCR engine is served from this site (copied out of `node_modules` at build time by a small Vite plugin) and only loads the first time someone scans, so the app itself stays fast.
- **Tested:** the money, charges and settle-up logic have unit tests (`src/lib/*.test.ts`).

## Tech
React 19 · TypeScript · Vite · Vitest · Tesseract.js · plain CSS (custom properties for theming)

## Run it
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run unit tests
npm run build    # production build → dist/
```

## Project structure
```
src/
├── App.tsx                  state + layout
├── components/              PeoplePanel, ExpenseForm, ExpenseList, Summary, ThemeToggle
├── hooks/usePersistentState.ts   useState that saves to localStorage
├── components/ReceiptScanner.tsx   camera → OCR → review flow
├── lib/receipt.ts           turns receipt text into items + charges
├── lib/ocr.ts               image clean-up + Tesseract.js worker
├── lib/bill.ts              service charge, SST, itemised shares
├── lib/money.ts             parse/format RM, split evenly
├── lib/settle.ts            balances + settle-up algorithm
└── lib/settle.test.ts       unit tests
```
