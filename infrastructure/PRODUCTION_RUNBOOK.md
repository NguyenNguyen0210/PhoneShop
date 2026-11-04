# MobileCommerce production release runbook

Production releases use the manual **Deploy Backend (manual production release)** GitHub Actions workflow from the `main` branch. They target a Linux host with Docker Compose, Git, a TLS-terminating reverse proxy and the repository checked out at `/app/phoneshop`. The current workflow **does not deploy the Vercel frontend**.

## Before the first release

1. Configure the `production` GitHub environment with required reviewers and repository/environment secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`. Pin the actual server host key; never obtain it by blindly accepting a connection at deployment time.
2. Provision `backend/.env.production` on the host, outside Git. At minimum, verify `DATABASE_URL`, strong `JWT_SECRET` and `JWT_REFRESH_SECRET`, `FRONTEND_URL` (the **single HTTPS storefront origin**), Google OAuth credentials/redirects if enabled, R2 credentials, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` and payment callback URLs. Startup intentionally fails in production if VNPay credentials are missing or are sandbox placeholders. Set `NODE_ENV=production` via Compose. Keep the production file readable only by the deploy account.
3. Ensure a reverse proxy serves HTTPS and routes `/api/*` to `127.0.0.1:3000`. This Compose file exposes the backend **on loopback only**. Confirm DNS, TLS, provider callbacks and any provider-side IP allowlists.
4. Verify frontend build environment in Vercel: `VITE_API_URL` must point to the deployed PhoneShop API, `VITE_GOOGLE_CLIENT_ID` and the configured OAuth redirect must belong to the intended Google Cloud OAuth client. A local ignored `frontend/.env.production` file does not update Vercel. Confirm R2 public URL is also correct.
5. Freeze release writes or schedule a maintenance window if the migration requires it. Review `prisma/migrations/20261103100000_sync_schema`: it removes four **empty** legacy tables and deliberately fails if they contain data. Any existing returns/refunds/idempotency records require a reviewed archive or data-migration plan; do not delete them to bypass the guard. An already-applied migration with a different checksum also blocks the preflight.

## Database backup and staging rehearsal

Create a timestamped, restorable PostgreSQL backup using your database provider's snapshot tools or `pg_dump` from a restricted operator machine. Keep backup credentials and artifacts out of the repository. Example (run with `DATABASE_URL` set in the operator's environment):

```bash
umask 077
pg_dump --format=custom --no-owner --no-privileges --file="mobilecommerce-$(date -u +%Y%m%dT%H%M%SZ).dump" "$DATABASE_URL"
```

Verify the backup is complete with `pg_restore --list <backup-file>` and **restore it into a separate, isolated staging database**, validating key row counts and payment/order/return records. Record its immutable backup ID/path and the successful restore verification in the release ticket. A backup identifier passed to the pipeline is a **human attestation**, not automated proof of restoration.

On the staging copy, first run the exact pending-migration checks and then rehearse migrations using the staged release checkout:

```bash
cd backend
NODE_ENV=production PRODUCTION_BACKUP_REFERENCE=staging-verified-restore node scripts/preflight-production-migrations.cjs
npx prisma migrate deploy
npx prisma migrate status
```

Run API smoke tests against staging: `/api/health`, user login, cart/checkout, duplicate payment callbacks, refund idempotency, shipping transitions, and stock/Flash Sale rollback. Simulate a failed rollout and test the app-image recovery path. Never rehearse destructive commands on the live database.

## Deploy and verify

Run the GitHub workflow **from `main`**, supply the validated backup reference, and approve the protected `production` environment after reviewing the tested commit and verified backup. The workflow checks out that commit on the host, builds an API image, checks the database for dangerous migration conditions, runs `prisma migrate deploy`, starts the API and checks the database-backed health endpoint. Successful CI/build alone is insufficient to prove live readiness.

Verify HTTPS at the public host, CORS from the storefront, checkout and payment provider signatures/callbacks, error monitoring, logs without credentials or raw URL query parameters, and operational metrics. Monitor failed payments/refunds and order/inventory state following the release.

## Rollback / incident response

If the health check fails, `infrastructure/deploy-production.sh` attempts to restore the previous **API image**. It does **not** reverse schema changes. Confirm the restored image is compatible with the new schema; otherwise stop writes, investigate and recover using the verified backup or a forward-fix migration.

Restoring a database backup discards any legitimate writes since that snapshot. Establish the correct recovery point with the incident owner; preserve newer orders/payments/refunds and coordinate reconciliation before restoring a production database. Test restore procedures on staging first. Never point the disposable rehearsal database or local test scripts at the live instance.

## Known release blockers outside the repository

- Production/staging secrets and an independently verified, restorable backup are operator responsibilities.
- Legacy business records, migration history conflicts, Google OAuth registration and external payment callbacks require validation against the **actual** target environment.
- The documented hosted PhoneShop API is `https://phoneshop-api.onrender.com/api`, while the provided production workflow assumes an SSH-managed Docker host. Confirm which runtime will actually serve production before using the workflow.
