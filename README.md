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


### Entity relationships

`profiles` own `borrow_records` and `reservations`; `books` own many `book_copies`; a borrow record references one physical copy; a reservation references a book and member and can be assigned a held copy.

## Hard problem solved: fair FIFO holds

The return route selects the oldest waiting reservation ordered by `reservedAt`, changes the returned copy directly to `reserved_held`, assigns the member, and creates a 48-hour expiry. The borrow route refuses copies in that held state for anyone except the reserved member. Server routes validate the session before mutating MongoDB.

## Tests

`__tests__/library-logic.test.js` covers exact due dates, on-time and late fines, the three-book limit, FIFO ordering, and unauthorized held-copy checkout.



## AI tools disclosure

AI assistance was used for initial scaffolding, UI ideation, and test-case drafting. Business rules, security boundaries, schema constraints, and final code were reviewed and integrated for this project.
