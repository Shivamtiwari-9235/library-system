# Lumen Library

Lumen is a full-stack Next.js App Router application with JavaScript, Tailwind CSS, MongoDB, and cookie-based authentication.

## Run locally

```bash
npm install
copy .env.example .env.local
# add MongoDB URL, database name, and AUTH_SECRET
npm run seed
npm run dev
npm test
```

Run `npm run seed` to create MongoDB collections, indexes, catalog copies, and the two demo accounts used by the quick-login buttons.

Demo logins:

- Librarian: `librarian@library.com` / `admin123`
- Member: `member@library.com` / `member123`

## Architecture

- `components/dashboard.jsx` is the responsive client dashboard. It provides catalog search, librarian book creation and member selection, member borrowing/reservations, librarian returns, overdue reporting, and fine summaries.
- `lib/business-logic.js` contains pure, testable rules for 14-day loans, fines, the three-book limit, FIFO reservations, and held-copy protection.
- `src/app/api` contains the backend route handlers for catalog reads, borrowing, returns, reservations, and librarian member lookup. All mutations validate the signed session and request identifiers on the server.
- `lib/auth.js` provides signed cookie sessions and password hashing for the Next.js backend.

### Entity relationships

`profiles` own `borrow_records` and `reservations`; `books` own many `book_copies`; a borrow record references one physical copy; a reservation references a book and member and can be assigned a held copy.

## Hard problem solved: fair FIFO holds

The return route selects the oldest waiting reservation ordered by `reservedAt`, changes the returned copy directly to `reserved_held`, assigns the member, and creates a 48-hour expiry. The borrow route refuses copies in that held state for anyone except the reserved member. Server routes validate the session before mutating MongoDB.

## Tests

`__tests__/library-logic.test.js` covers exact due dates, on-time and late fines, the three-book limit, FIFO ordering, and unauthorized held-copy checkout.

## 3–5 minute walkthrough script

- **0:00–0:35** — Introduce the dashboard, theme toggle, catalog search, live availability indicators, and librarian workspace.
- **0:35–1:20** — Open `lib/business-logic.js`; explain why dates are calculated in UTC, the 14-day contract, and the ₹5/day fine.
- **1:20–2:10** — Show the MongoDB collections and explain the relationship between books and physical copies.
- **2:10–3:10** — Walk through `src/app/api/returns/route.js`: FIFO ordering, reserved-held status, and 48-hour claim window.
- **3:10–3:45** — Show the borrow route rejecting the third active loan and protecting held copies.
- **3:45–4:15** — Run `npm test` and briefly review the six automated business-rule checks.

## AI tools disclosure

AI assistance was used for initial scaffolding, UI ideation, and test-case drafting. Business rules, security boundaries, schema constraints, and final code were reviewed and integrated for this project.
