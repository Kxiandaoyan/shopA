# Deployment Guide

## Overview

This project is a multi-tenant B2C mall SaaS with:

- English storefronts on multiple landing domains
- Chinese super admin and affiliate admin back offices
- Per-domain Stripe credential mapping
- Signed intake API
- Required landing-page-first redirect before Stripe checkout

The recommended production topology is:

- `Next.js` application server
- `PostgreSQL` database
- TLS-enabled reverse proxy that routes multiple domains to the same app
- Background-safe webhook delivery endpoint for Stripe

## Environment Requirements

- Node.js 22+ LTS
- npm 11+
- PostgreSQL 15+
- Public HTTPS domains
- One Stripe account credential set per landing domain

## Environment Variables

Create `.env` from `.env.example` and configure at minimum:

- `DATABASE_PROVIDER`
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_INTERNAL_BASE_URL`
- `INTAKE_TOKEN_SECRET`
- `STRIPE_SECRET_ENCRYPTION_KEY`

Optional local compatibility only:

- `INTAKE_SIGNATURE_SECRET`

Per-domain Stripe secrets should not be stored as flat environment variables for long-term production use. Store them in the database, encrypted at rest, and manage them only from the super admin backend.

## Recommended Deployment Steps

1. Provision PostgreSQL and create the application database.
2. Deploy the Next.js app to a Node-compatible host.
3. Point all landing domains to the same application ingress.
4. Configure TLS for every landing domain.
5. Apply the database schema.
6. Seed the initial product catalog from the root product source TXT file.
7. Create the super admin account.
8. Add affiliates, domain pools, and domain-specific Stripe credentials.
9. For each landing domain, choose its Stripe checkout display-name strategy.
10. Configure one intake signing secret and one callback signing secret per affiliate.
11. Configure allowed affiliate `returnUrl` entries.
12. Tell each affiliate how to verify callback signatures.
13. Register Stripe webhooks for each Stripe account using its own `/api/stripe/webhooks/{stripeAccountId}` path.
14. Verify the full intake -> landing -> checkout -> return flow on each domain.

## Domain Routing

All landing domains resolve to the same app, but the app must inspect the request host to determine:

- which tenant domain record is active
- which storefront template to render
- which Stripe credential set to use
- which Stripe checkout display-name strategy to use for affiliate orders

If no template is configured for a domain, the app must use template `A`.

## Database Operations

Local development uses SQLite by default. Production should switch to PostgreSQL.

### Local SQLite

```bash
npm install
npm run db:use:sqlite
npm run db:push
npm run seed:products
npm run seed:dev
```

### Production PostgreSQL

```bash
npm install
npm run db:use:postgres
npm run db:push
npm run seed:products
```

Current installation flow uses `db push`. If you later maintain formal PostgreSQL migration files for release deployment, replace `npm run db:push` with:

```bash
npx prisma migrate deploy
```

During later releases:

```bash
npm run build
npm run start
```

## Local Bootstrap

For first local startup:

1. Copy `.env.example` to `.env`
2. Keep `DATABASE_PROVIDER=sqlite`
3. Fill `AUTH_SECRET`, `STRIPE_SECRET_ENCRYPTION_KEY`
4. Run:

```bash
npm install
npm run db:use:sqlite
npm run db:push
npm run seed:products
npm run seed:dev
npm run dev
```

5. Open `http://localhost:3000/login`
6. Use the seeded local admin credentials to enter the admin backend
7. Create affiliates, domains, return URLs, affiliate intake secrets, callback secrets, Stripe configs, and affiliate-admin accounts

To create a production super admin without any login backdoor:

```bash
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="ReplaceWithAStrongPassword"
$env:ADMIN_NAME="Main Admin"
npm run admin:create
```

## Switching to PostgreSQL

When you move online:

1. Provision PostgreSQL
2. Update `.env` with:

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@host:5432/shopa
```

3. Switch the generated Prisma schema:

```bash
npm run db:use:postgres
```

4. Apply the schema:

```bash
npm run db:push
```

5. Seed required data:

```bash
npm run seed:products
```

6. In the admin backend, configure each landing domain's Stripe checkout display-name strategy:

- `CATALOG_RANDOM`: stable pseudo-random storefront product name
- `FIXED`: one fixed name for that domain
- `SOURCE_PRODUCT`: first non-empty imported product name

## Reverse Proxy Notes

The reverse proxy must forward:

- `Host`
- `X-Forwarded-Proto`
- `X-Forwarded-For`

The application depends on the real host for domain-template resolution and Stripe callback URL construction.

## Affiliate Callback Verification

When payment finishes, the buyer returns to your landing domain first and only then gets redirected to the affiliate `returnUrl`.

The redirect now includes:

- `affiliateCode`
- `orderId`
- `externalOrderId`
- `status`
- `ts`
- `sig`

`sig` is an HMAC-SHA256 signature built from:

```text
affiliateCode.orderId.externalOrderId.status.ts
```

using the affiliate-specific callback signing secret configured in the admin backend.

Affiliates should:

1. Recompute the HMAC using the shared callback secret.
2. Compare it with `sig` using a constant-time comparison.
3. Reject callbacks where `ts` is older than 5 minutes.

If no callback signing secret is configured for an affiliate, the app still redirects back to the affiliate site, but only with unsigned status parameters.

## Post-Deployment Verification

Verify at minimum:

- intake API accepts a valid signed request
- invalid signatures are rejected
- a domain is randomly allocated from the affiliate's pool
- homepage loads on the allocated domain
- homepage auto-redirects to Stripe checkout
- Stripe success/failure/cancel returns to the same domain first
- result page auto-redirects to the affiliate `returnUrl`
- logs are visible in super admin
- affiliate sees only its own orders

## Operational Notes

- Do not expose Stripe secret keys to affiliate admins.
- Do not allow unrestricted `returnUrl` values.
- Use database backups from day one.
- Monitor webhook delivery failures.
- Log all admin changes related to domains, templates, Stripe keys, and return URL allowlists.
