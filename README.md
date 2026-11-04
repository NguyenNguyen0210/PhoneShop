# PhoneShop

**A full-stack e-commerce platform for mobile phones and accessories, with device-level inventory tracking and operational workflows.**

<p align="center">
  <img src="frontend/public/logo-horizontal.png" alt="PhoneShop" width="320" />
</p>

PhoneShop brings together a customer storefront, staff workspace, and administration portal. Built with React, NestJS, and PostgreSQL, it covers the order lifecycle from checkout and IMEI reservation to payment, fulfillment, returns, and after-sales support.

[Live application](https://phoneshop-blond.vercel.app) · [Backend health](https://phoneshop-api.onrender.com/api/health) · [Source code](https://github.com/NguyenNguyen0210/PhoneShop)

The hosted application may differ from the current checkout. Interactive Swagger documentation is available locally at `/api/docs` in non-production environments.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Business workflows](#business-workflows)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment](#deployment)
- [Repository structure](#repository-structure)
- [Further documentation](#further-documentation)

## Features

| Area | Capabilities |
| --- | --- |
| Customer storefront | Product discovery, variant selection, cart, wishlist, checkout, order tracking, reviews, and notifications |
| Identity and access | Email/password authentication, JWT access and refresh tokens, Google sign-in, password reset, and role-based authorization |
| Store operations | Product and variant management, brands, categories, suppliers, inventory adjustments, IMEI tracking, and stock movement history |
| Orders and payments | VNPay, VietQR bank transfers, cash on delivery, reservation expiration, fulfillment transitions, and refund recording |
| Promotions | Vouchers with global and per-user limits, flash-sale pricing, atomic quota claims, and quota restoration |
| After-sales support | Warranty lookup, repair intake and handover, support tickets, customer history, and audit logs |
| Administration | Sales analytics, cashflow reporting, payment reconciliation, and configurable store and payment settings |

The application defines four roles: `USER`, `STAFF`, `MANAGER`, and `ADMIN`. API guards enforce authorization; frontend route guards adapt the available portals and actions to the signed-in user.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Ant Design |
| State and data fetching | Zustand, TanStack Query, Axios |
| Charts and icons | Recharts, Lucide, Ant Design Icons |
| Backend | NestJS 11, TypeScript, REST APIs, Swagger/OpenAPI, scheduled jobs |
| Database | PostgreSQL, Prisma ORM 7, PostgreSQL driver adapter |
| Authentication and validation | Passport.js, JWT, bcrypt, Google OAuth 2.0, class-validator, class-transformer |
| HTTP security | Helmet, request throttling, CORS configuration, ownership checks |
| Payments | VNPay, VietQR, cash on delivery |
| Media and email | Cloudflare R2 through the S3-compatible SDK, Sharp, Brevo, Nodemailer/SMTP |
| Quality and delivery | Jest, NestJS Testing, Python Playwright, Oxlint, Docker, GitHub Actions |

Frontend pages and layouts are loaded through route-level dynamic imports. PostgreSQL 17 is used in the backend CI service and integration-test setup.

## Architecture

The backend is organized as a **modular monolith**. Domain modules contain controllers, DTOs, and services; shared infrastructure provides database access, email, storage, and request throttling.

```mermaid
flowchart LR
    Browser[Customer / Staff / Admin] --> UI[React application]
    UI -->|REST API| API[NestJS controllers and guards]
    API --> Domain[Domain services]
    Scheduler[Reservation expiry scheduler] --> Domain
    Domain --> ORM[Prisma transactions]
    ORM --> DB[(PostgreSQL)]
    Domain --> Payments[VNPay / VietQR]
    Domain --> Email[Brevo / SMTP]
    Domain --> Storage[Cloudflare R2]
```

Key implementation decisions:

- **Transactional checkout:** IMEI allocation uses `FOR UPDATE SKIP LOCKED`, together with guarded inventory updates, to handle competing purchases.
- **Explicit state transitions:** Order, shipment, payment, and repair workflows validate their current state before applying related changes.
- **Immutable delivery details:** Orders retain a shipping address snapshot so that editing or deleting a saved address does not rewrite order history.
- **Traceable financial changes:** Successful payments and refunds are recorded as transactions; refund confirmation also records the actor, reference, amount, and reason.
- **Separation of payment and delivery:** Capturing payment does not sell the reserved device or start warranty coverage. Those changes occur at delivery.

## Business workflows

### Checkout and fulfillment

1. Checkout validates the selected cart items, current prices, shipping address, promotions, and available inventory.
2. Selected devices move from `AVAILABLE` to `RESERVED`; available stock decreases and reserved stock increases in the checkout transaction.
3. Unpaid online orders receive a **15-minute reservation**. A scheduled job releases expired reservations and restores applicable promotion quotas. COD orders do not use this timeout.
4. Online orders require a paid or partially refunded payment before fulfillment. VNPay uses signed callbacks; bank-transfer confirmation requires a transaction reference.
5. Successful delivery changes the assigned devices to `SOLD`, settles inventory, records a stock movement, and activates warranty coverage. COD payments are recorded as paid at this step.

The standard fulfillment path is:

```text
PENDING -> CONFIRMED -> PROCESSING -> PACKED -> SHIPPING -> DELIVERED -> COMPLETED
```

Some operations allow intermediate steps to be skipped. The backend transition rules remain authoritative.

### Returns and refund recording

**The refund API records a refund already completed outside the application; it does not send money through a bank or payment provider.** A completed refund must have a unique provider reference.

| Scenario | Result |
| --- | --- |
| Partial refund | Records the amount against the remaining paid balance; keeps the current order and inventory state |
| Full refund before dispatch | Cancels the order and releases the reserved devices and stock |
| Carrier return | Marks the order and devices as returned, settles the original reservation, and quarantines the devices |
| Full refund after delivery | Marks the order as returned and voids applicable warranties without adding sellable stock |
| Accepted return after inspection | An explicit IMEI release restores the device to available inventory |

Orders in transit must complete the return workflow before refund confirmation. A partial refund does not allow the remaining captured payment to be bypassed through ordinary order cancellation.

### Warranty and reporting

Warranty coverage begins at delivery and follows the product's configured duration. Repair handling follows:

```text
REQUESTED -> RECEIVED -> REPAIRED -> RETURNED
```

A device under repair remains customer-owned and is not added to sellable stock. Staff actions require notes and produce audit entries. Public warranty lookup accepts a warranty code, IMEI, or serial; phone lookup requires authentication and is limited to the current account.

Cashflow reports calculate gross receipts, refunds, and net receipts from successful payment transactions. Daily totals use transaction recording time in `Asia/Ho_Chi_Minh`. Brand and category charts describe delivered-item sales and are distinct from cashflow reconciliation.

## Getting started

### Prerequisites

- Node.js **22.12 or later on the Node 22 release line**, matching the CI runtime and Vite requirements.
- npm; the backend CI installs npm 11.
- A PostgreSQL database. Docker is optional for running a local instance.
- Python and Playwright only if you intend to run browser tests.

The examples below use **PowerShell**, with commands run from the repository root unless stated otherwise.

### 1. Clone the repository

```powershell
git clone https://github.com/NguyenNguyen0210/PhoneShop.git
cd PhoneShop
```

### 2. Start a local database

Use an existing development database, or create an isolated local instance:

```powershell
docker run --detach --name phoneshop-postgres -e POSTGRES_USER=phoneshop -e POSTGRES_PASSWORD=local_dev_only -e POSTGRES_DB=phoneshop_dev -p 127.0.0.1:55432:5432 postgres:17
```

For this container, the connection string is:

```text
postgresql://phoneshop:local_dev_only@127.0.0.1:55432/phoneshop_dev
```

### 3. Configure and start the backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env.development
```

Edit `.env.development` before proceeding:

- Set `DATABASE_URL` to the development database above.
- Replace `JWT_SECRET` and `JWT_REFRESH_SECRET` with separate generated secrets.
- Keep `FRONTEND_URL=http://localhost:5173` for the default local frontend.
- Remove placeholder credentials for integrations you are not configuring. Leave email credentials blank for console/mock delivery; missing R2 credentials disable uploads.

Generate a secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The application loads `.env.development` by default. Prisma CLI and the seed script use `dotenv/config`, so explicitly point them to the same file:

```powershell
$env:DOTENV_CONFIG_PATH = '.env.development'
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

On Bash, the corresponding environment assignment is `export DOTENV_CONFIG_PATH=.env.development`. Variables already present in your shell take precedence over file values.

| Local endpoint | Purpose |
| --- | --- |
| `http://localhost:3000/api` | REST API base URL |
| `http://localhost:3000/api/health` | Database-backed health check |
| `http://localhost:3000/api/docs` | Interactive Swagger documentation, outside production |

### 4. Start the frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.development
npm run dev
```

Set `VITE_API_URL=http://localhost:3000/api` in the frontend environment file. Open `http://localhost:5173`.

### 5. Optional demo data

The seed script populates catalog, customer, order, and after-sales examples. **It clears existing transactional and demo customer data and resets seeded accounts. Run it only against a disposable development database.**

From `backend/`, with `DOTENV_CONFIG_PATH` set as above:

```powershell
npm run prisma:seed
```

Account setup is defined in [`backend/prisma/seed.ts`](backend/prisma/seed.ts). These seeded accounts are for local evaluation, not deployment credentials.

## Configuration

Use [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) as configuration references.

| Integration | Configuration |
| --- | --- |
| Database | `DATABASE_URL` |
| Authentication | `JWT_SECRET`, `JWT_REFRESH_SECRET`, token expiry settings |
| Frontend/API connection | Backend `FRONTEND_URL`; frontend `VITE_API_URL` |
| Google sign-in | Backend `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`; matching frontend `VITE_GOOGLE_CLIENT_ID` |
| VNPay | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL` |
| VietQR | `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` |
| Media uploads | `CLOUDFLARE_R2_*` credentials, bucket, and public URL |
| Email | `EMAIL_PROVIDER`, `EMAIL_FROM`, and either `BREVO_API_KEY` or SMTP credentials |

Only expose public configuration through `VITE_*` variables: those values are included in the browser bundle. Keep payment signing secrets, Google client secrets, database credentials, and storage credentials on the backend.

Register Google redirect URIs and VNPay callback URLs for the intended environment. Production startup requires configured VNPay credentials and a single HTTPS `FRONTEND_URL`. See the [Google OAuth setup guide](infrastructure/GOOGLE_OAUTH_SETUP.md) and [production runbook](infrastructure/PRODUCTION_RUNBOOK.md).

## Testing and quality checks

### Service tests and builds

From `backend/`, after installing dependencies, configuring the CLI environment, and generating Prisma Client:

```powershell
npm test -- --runInBand
npm run build
```

From `frontend/`:

```powershell
npm run lint
npm run build
```

Service tests use dependency doubles. Database integration tests are skipped unless `TEST_DATABASE_URL` is set explicitly.

### PostgreSQL integration tests

Create a separate disposable database:

```powershell
docker run --detach --rm --name phoneshop-tests -e POSTGRES_USER=tester -e POSTGRES_PASSWORD=local_test_only -e POSTGRES_DB=phoneshop_test -p 127.0.0.1:55439:5432 postgres:17
```

From `backend/`, after PostgreSQL is ready:

```powershell
$env:DATABASE_URL = 'postgresql://tester:local_test_only@127.0.0.1:55439/phoneshop_test'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npx prisma migrate deploy
npm run test:integration
```

The integration suite accepts only `localhost` or `127.0.0.1`, with a database name ending in `_test`, `_ci`, or `_audit`. It creates fixture data in that database.

Coverage includes competing checkouts for the last device, signed VNPay callbacks, concurrent refunds, transaction rollback, pre-dispatch cancellation, carrier returns and restocking, address snapshots, blocked-device reconciliation, warranty repairs, and timezone-aware cashflow reporting.

After testing:

```powershell
docker stop phoneshop-tests
Remove-Item Env:TEST_DATABASE_URL
Remove-Item Env:DATABASE_URL
```

The last recorded local validation of this checkout passed **91 tests across 17 suites**, including **16 tests against PostgreSQL**. Counts describe that validation run, not a coverage percentage or a guarantee about a hosted release.

### Browser tests

[`frontend/e2e/business-smoke.py`](frontend/e2e/business-smoke.py) exercises login, the unpaid-order guard, pre-dispatch refunds, repair intake/completion/handover, and the anonymous phone-lookup restriction.

It uses a disposable local database, fixture data, the API on port `3101`, and the frontend on port `5175`. Setup and fixture generation are described in [Business rules and verification](infrastructure/BUSINESS_RULES.md).

### Continuous integration

- [Backend CI](.github/workflows/backend-ci.yml): dependency audit, Prisma Client generation, build, migration rehearsal, service tests, and PostgreSQL integration tests.
- [Frontend CI](.github/workflows/frontend-ci.yml): dependency installation, lint, and production build.

## Deployment

The frontend can be deployed as a static Vite application; the backend runs as a Node.js service with PostgreSQL and optional external integrations.

For backend image preparation:

```powershell
docker compose -f docker-compose.prod.yml build backend
```

The production Compose configuration expects `backend/.env.production`, binds the API to host loopback, and includes a separate migration service. Follow the [production release runbook](infrastructure/PRODUCTION_RUNBOOK.md) for backup verification, migration preflight, release, and recovery.

The development `docker-compose.yml` runs **only the backend**; it does not provision PostgreSQL or the frontend. If using it, provide a database address reachable from the container, rather than the host-only `127.0.0.1` connection string.

The included manual deployment workflow targets an SSH-managed Docker host. The linked API uses a Render hostname, so confirm the actual hosting target before using that workflow. The backend workflow does not deploy the frontend.

## Repository structure

```text
.
|-- backend/
|   |-- prisma/               # Schema, migrations, and demo-data seed
|   |-- scripts/              # Migration preflight and local smoke fixtures
|   |-- src/
|   |   |-- common/           # Guards, DTOs, filters, and shared utilities
|   |   |-- infrastructure/   # Email, storage, and request throttling
|   |   |-- modules/          # Domain modules
|   |   `-- prisma/           # Database service
|   `-- test/
|       `-- integration/      # Real PostgreSQL lifecycle tests
|-- frontend/
|   |-- e2e/                  # Playwright browser smoke test
|   |-- public/               # Public assets
|   `-- src/
|       |-- components/
|       |-- layouts/
|       |-- pages/            # Storefront, staff, and admin views
|       |-- routes/
|       |-- services/
|       `-- stores/
|-- infrastructure/           # Docker image and operational guides
|-- .github/workflows/        # CI and manual backend deployment
|-- docker-compose.yml
`-- docker-compose.prod.yml
```

## Further documentation

- [Business rules and verification](infrastructure/BUSINESS_RULES.md) - detailed order, inventory, refund, and repair behavior; test setup.
- [Production release runbook](infrastructure/PRODUCTION_RUNBOOK.md) - environment preparation, backup verification, migration rehearsal, and recovery.
- [Google OAuth setup](infrastructure/GOOGLE_OAUTH_SETUP.md) - Google sign-in configuration and validation.
- [Prisma schema](backend/prisma/schema.prisma) - data models, relations, and enums.
