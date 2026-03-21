# Shopa

Multi-tenant B2C storefront SaaS with:

- hosted Stripe Checkout
- forced two-step redirect: landing page first, checkout second
- per-domain Stripe account binding
- affiliate intake API with signed payloads
- affiliate callback redirect with optional HMAC signature
- English storefront and Chinese admin / affiliate back office
- three storefront templates with per-domain assignment

## Stack

- Next.js 16
- TypeScript
- SQLite for local development
- PostgreSQL for production
- Prisma 7
- Stripe Checkout
- Vitest

## Local Setup

1. Create `.env` and set at minimum:

```env
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db
AUTH_SECRET=replace-me
NEXTAUTH_URL=http://localhost:3000
APP_INTERNAL_BASE_URL=http://localhost:3000
INTAKE_TOKEN_SECRET=replace-me
INTAKE_SIGNATURE_SECRET=
STRIPE_SECRET_ENCRYPTION_KEY=replace-me
```

2. Install dependencies:

```bash
npm install
```

3. Switch the active Prisma client to SQLite for local development:

```bash
npm run db:use:sqlite
npm run db:push
```

4. Seed products and demo data:

```bash
npm run seed:products
npm run seed:dev
```

5. Start the app:

```bash
npm run dev
```

6. If you need a dedicated super admin account instead of using seeded local data:

```bash
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="ReplaceWithAStrongPassword"
$env:ADMIN_NAME="Main Admin"
npm run admin:create
```

## Database Switching

Use SQLite locally:

```bash
npm run db:use:sqlite
npm run db:push
```

Switch to PostgreSQL later:

```bash
npm run db:use:postgres
```

Then set PostgreSQL `DATABASE_URL` in `.env` and initialize the target database:

```bash
npm run db:push
```

If you later add production migrations, run `npx prisma migrate deploy` after switching to PostgreSQL.

## Main Routes

- Admin login: `http://localhost:3000/login`
- Super admin: `http://localhost:3000/admin`
- Affiliate backend: `http://localhost:3000/affiliate`

## Core Flow

1. Affiliate server calls `POST /api/intake/orders`
2. System validates signature, timestamp, nonce, and return URL allowlist
3. System randomly assigns one landing domain from the affiliate's domain pool
4. Buyer opens `landingUrl`
5. Landing page records the visit and auto-redirects to `/checkout/redirect`
6. App creates or reuses Stripe Checkout Session for the assigned domain
7. Stripe returns to the same landing domain first
8. App records payment result locally
9. App auto-redirects to the affiliate `returnUrl`

If the affiliate has a callback secret configured, the return redirect includes `ts` and `sig`.

## Important Docs

- Plan: `docs/plans/2026-03-16-b2c-saas-mall.md`
- Hardening plan: `docs/plans/2026-03-16-hardening-upgrade.md`
- Deployment: `docs/deployment.md`
- BT Panel deployment: `docs/deployment-bt-panel.md`
- Stripe setup: `docs/stripe-setup.md`
- Distributor integration: `docs/distributor-integration.md`

## Notes

- Stripe secrets and webhook secrets are stored encrypted in the database.
- `returnUrl` must be allowlisted in the admin backend.
- Callback signature is recommended for affiliates that need strong confirmation.
- Affiliate backend users can only view their own affiliate's orders.
