# PharmacyPOS

Point-of-sale, inventory and lab system for a pharmacy. Ships as a Windows desktop
app: Electron starts the Express + Sequelize backend on `127.0.0.1:5000` and loads the
React UI from it, so a till needs no browser and no separate web server.

- **Backend** — Express 4, Sequelize 6, PostgreSQL 16 (`backend/`)
- **Frontend** — React 19, Vite, TypeScript, Tailwind, Zustand (`frontend/`)
- **Desktop shell** — Electron 38, packaged with `electron-builder` (`main.cjs`, `electron-builder.yml`)

## Requirements

- Node.js 22 or newer (the backend test runner uses `node --test` with glob patterns)
- PostgreSQL 16 running locally, or a hosted database via `DATABASE_URL`

## Setup

```bash
npm run install:all            # root + backend + frontend dependencies

cd backend
copy .env.example .env         # then edit .env  (cp on macOS/Linux)
npm run migrate                # build the schema
npm run seed                   # company, demo users, catalogue, reference data

cd ..
npm run dev                    # backend :5000, Vite :3000, Electron window
```

`JWT_SECRET` in `backend/.env` must be a real value of at least 32 characters — the
server refuses the placeholder from the repository:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`npm run seed` creates five demo accounts (`admin@pharmacy.com`/`admin123`,
`manager@pharmacy.com`/`manager123`, `cashier@pharmacy.com`/`cashier123`,
`pharmacist@pharmacy.com`/`pharmacist123`, `lab@pharmacy.com`/`lab123`). For a till
other people use, set `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`,
`SEED_CASHIER_PASSWORD`, `SEED_PHARMACIST_PASSWORD` and `SEED_LAB_PASSWORD` in
`backend/.env` before seeding, and change each account password after first sign-in.

## Commands

| Where | Command | Does |
| --- | --- | --- |
| root | `npm run dev` | backend + Vite + Electron together |
| root | `npm test` | backend unit tests |
| root | `npm run migrate` / `npm run check:schema` | schema, from the repo root |
| root | `npm run build:win-portable` / `build:win-installer` | packaged app into `release/` |
| backend | `npm start` | API only — no hot reload, restart after editing |
| backend | `npm test` | unit tests (`backend/tests/`) |
| backend | `npm run migrate:status` / `migrate:down` | inspect or revert migrations |
| backend | `npm run seed` | top up catalogue and reference rows |
| backend | `npm run backup` | `pg_dump` into `backend/backups/` |
| frontend | `npm run lint` / `npm run build` | ESLint / production bundle |

## How money is handled

Prices are computed server-side from the catalogue in `backend/utils/pricing.js`;
amounts sent by the client are ignored. Each line is:

```
unitPrice  = product.sellingPrice ?? product.unitPrice
subtotal   = unitPrice × quantity − discounts      (discount capped at the line value)
tax        = subtotal × company.taxRate / 100      (15% only when the rate is unset)
total      = subtotal + tax                        (exact in stored cents)
```

An insurance provider either covers a `percentage` of the ticket or a fixed
`insurancePrice` per unit, never more than the net line is worth. Both shares are
measured against the VAT-inclusive total, so `insuranceCoverage + copayAmount` always
equals `total`; a `fixed` tariff caps at the net line and then picks up the VAT on the
covered amount. Before this, the insurer's share was a slice of the *net* subtotal and
the VAT on it was billed to nobody. Lab orders carry no VAT (`priceLabTests` returns
`taxRate: 0`), so their split stays a straight share of the bill.
`LabTest.testPrice` is a unit price — line totals multiply it by the quantity.
`product.cost` feeds profit and COGS reports only and never appears on a receipt.
Seeded demo products deliberately have no cost, and `npm run seed` warns instead of
inventing one.

Stock moves through `backend/utils/stock.js` inside the sale transaction with
`SELECT … FOR UPDATE`, so two cashiers cannot oversell the last unit: one succeeds,
the other gets `400 Not enough stock … Available: 0`.

## Schema policy

**Migrations are the source of truth.** `backend/migrations/` can build the schema
from nothing, and the server no longer runs `sync({ alter: true })`. On every boot, and
in CI, `backend/utils/checkSchema.js` compares each model's attributes against
`information_schema` and refuses to start when the database is behind:

```
Model/schema drift detected — the database is behind the models.
  missing column: products.someNewField
Add a migration for the above and run `npm run migrate` before starting the server.
```

Add a migration whenever you add a model column, and give it a `down()` —
`npm run migrate:down` refuses to revert a migration that has none. Migrations are
written to be re-runnable (`IF NOT EXISTS`, guarded `DO $$` blocks) and issue raw SQL
on the migration's own transaction connection.

## Tests and CI

`backend/tests/` uses Node's built-in runner and installs nothing extra:

- `pricing.test.js` — catalogue pricing, cent-exact totals, VAT fallback, discount caps, insurance splits
- `validators.test.js` — allow-listed field copying, payment-method casing, the numeric-id guard
- `dateRange.test.js` — a `to` date bound covers its whole day
- `routes.test.js` — every route file loads, is mounted by `server.js`, and no module imports a name its dependency does not export

`.github/workflows/ci.yml` runs the backend tests, applies all migrations to a fresh
Postgres 16, asserts `npm run check:schema` passes, boots the server against that
database, then lints and builds the frontend. `.github/workflows/build.yml` is
separate: it builds the Windows `.exe` on `v*` tags.

## Dependency advisories

`npm audit` in both `backend/` and `frontend/` is clean apart from one advisory that has
no usable fix — it is documented here so a future `npm audit` run is not mistaken for a
regression:

- **backend — `uuid@8` (2 moderate), via Sequelize.** The app never requires `uuid` and
  no model column uses `DataTypes.UUID`, so the vulnerable `v3`/`v5`/`v6` buffer paths
  are not reachable. The only "fix" npm offers is `audit fix --force`, which downgrades
  Sequelize to 3.x. Do not run it.

The frontend spreadsheet dependency is installed from the SheetJS CDN rather than npm:

- `xlsx: "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` in
  [frontend/package.json](frontend/package.json). The `xlsx` name on the npm registry
  stopped at the vulnerable 0.18.5, so `^0.18.5` could never be upgraded in place.
  `frontend/yarn.lock` is deleted: it pinned 0.18.5, so a `yarn install` would have
  reinstated the advisory the CDN URL removes. Everything here, including CI, uses npm.
  If a CDN-hosted dependency is unacceptable on a given network, the alternative is a
  maintained npm reader/writer such as `exceljs`, which needs the six `XLSX.*` calls in
  [PurchaseOrderPage.tsx](frontend/src/pages/PurchaseOrderPage.tsx) rewritten.

Vite's advisories are dev-server file-read/path-traversal issues; they do not affect the
packaged app, which ships `frontend/dist` and never starts the Vite server. Both are
updated anyway.

## Layout

```
backend/    Express API, Sequelize models, migrations, seeds, tests
frontend/   React SPA (pages, components, Zustand store in src/store)
main.cjs    Electron main process: starts the backend, opens the window
preload.js  The only bridge between the window and the main process
electron-builder.yml  packaging: what is copied in, and what must never ship
```

## Troubleshooting

- **`EADDRINUSE` on :5000** — an older backend is still listening. Find it with
  `netstat -ano | findstr :5000` (Windows) or `lsof -i :5000`, stop that PID, then start again.
- **Drift error at boot** — run `npm run migrate` in `backend/`. Do not re-enable `sync`.
- **Logins stop working after a restart** — `JWT_SECRET` was auto-generated for that
  process; set a stable secret in `backend/.env`.
- **A receipt or report shows `NaN`/blank** — Sequelize returns DECIMAL and JSONB
  columns as strings; amounts go through `safeNumber` in `frontend/src/utils/number.ts`.
- **Packaged app cannot reach its database** — the installer deliberately excludes your
  development `.env` and `backend/backups/` (see the `extraResources` filters in
  `electron-builder.yml`). Install and configure Postgres on the target machine and run
  `npm run migrate` there.
- **The packaged app has no icon** — `electron-builder.yml` reads icons from `build/`
  (`build/icon.ico`, `build/icons/`), and that directory is not in the repository. Add
  the icons before releasing, or builds fall back to the default Electron icon.

## Deploying the API to Render

`render.yaml` describes the JSON API plus a Postgres instance. It is optional — the
desktop app is self-contained — and it does not serve the browser UI, because the
backend looks for `frontend/dist` one directory above itself, which a
`rootDir: backend` deploy does not contain.
