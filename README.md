# SplitBill 🧾

Split group expenses without the awkward maths. Add who's in, log who paid for what, and SplitBill works out the **fewest payments** needed to settle up. Then copy a summary straight into your WhatsApp group.

**Live:** https://www.williamchanwinghong.com/projects/split-bill/

## Features
- Add people and expenses in RM, and split each expense with everyone or only some people
- Live balances showing who's owed and who owes
- **Settle up:** the minimum number of payments to clear everyone, at most *people − 1*
- One-click summary you can paste into WhatsApp
- Saves automatically in your browser, so nothing is uploaded
- Dark mode, mobile friendly

## How it works
- **Money is stored in sen (integers), not floats.** `0.1 + 0.2` in JavaScript is `0.30000000000000004`, so all maths uses whole cents. When an amount doesn't divide evenly, e.g. RM 10 between 3 people, the leftover sen goes to the first people, giving 3.34 / 3.33 / 3.33, so the total always adds up exactly.
- **Settling up:** each person's net balance is `paid − share`. A greedy algorithm repeatedly matches the person who owes the most with the person owed the most, which keeps the number of transfers small.
- **Tested:** the money and settle-up logic has unit tests (`src/lib/settle.test.ts`).

## Tech
React 19 · TypeScript · Vite · Vitest · plain CSS (custom properties for theming)

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
├── lib/money.ts             parse/format RM, split evenly
├── lib/settle.ts            balances + settle-up algorithm
└── lib/settle.test.ts       unit tests
```
