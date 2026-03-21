# B2C SaaS Mall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant B2C mall SaaS where affiliate websites submit buyer and product data to an intake API, receive an assigned landing-domain URL plus token, and buyers are forced through a two-step redirect flow: landing homepage first, then Stripe checkout.

**Architecture:** Use a single Next.js application for storefront, intake APIs, affiliate admin, and super admin. Persist tenant, domain, Stripe account, order, and payment-session state in PostgreSQL via Prisma. Domain assignment, token validation, and payment routing are first-class backend concerns so each order is bound to exactly one affiliate, one landing domain, and one Stripe account.

**Tech Stack:** Next.js 15, TypeScript, App Router, PostgreSQL, Prisma, NextAuth/Auth.js, Stripe SDK, Zod, Tailwind CSS, shadcn/ui, Vitest, Playwright

---

## Scope Summary

- Multi-tenant SaaS, not a single-store mall
- Affiliate site server calls intake API with buyer info + product info
- System creates pending order and signed token
- System chooses landing domain from the admin-assigned domain pool for that affiliate
- Buyer must land on homepage first, then homepage auto-redirects to Stripe checkout
- Each landing domain maps to exactly one Stripe account / secret set
- Affiliate can only view orders generated from domains assigned to that affiliate
- Affiliate cannot choose domains; super admin assigns domain pools
- Payment amount is taken from the affiliate API payload total, not recalculated from internal product catalog
- Full shipping address is mandatory in the intake API
- After payment, the user first returns to the assigned landing domain and is then immediately redirected onward to the original affiliate site if the return URL is allowlisted
- A single allowlisted `returnUrl` is used for all result states; the system appends query parameters such as `orderId` and `status`
- Storefront pages are English-only
- Super admin and affiliate admin back-office interfaces are Chinese-only
- Super admin requires detailed operational logs for intake, redirects, payment events, admin actions, and tenant/domain configuration changes
- Storefront supports three domain-selectable templates: `A`, `B`, and `C`
- If a landing domain has no explicit template assignment, it falls back to template `A`
- Template `A` should feel warm, clean, and home-care oriented for cleaning products
- Templates must be structurally distinct, not just color swaps

## Core Data Model

- `users`: login accounts for super admins and affiliate admins
- `affiliates`: tenant records
- `affiliate_memberships`: maps users to affiliates with role
- `landing_domains`: domain records, each owned by exactly one affiliate at a time
- `domain_templates`: optional template override per landing domain
- `stripe_accounts`: Stripe config records, each bound 1:1 to a landing domain
- `products`: product catalog normalized from the provided product file
- `orders`: buyer, source, product, amount, domain, and Stripe binding snapshot
- `payment_sessions`: Stripe checkout/payment intent tracking
- `intake_requests`: raw inbound API request log, signature result, idempotency result
- `audit_logs`: admin actions such as assigning domains or rotating Stripe credentials
- `affiliate_return_urls`: allowlisted post-payment return URLs or domains per affiliate
- `redirect_logs`: landing-page visit, checkout redirect, payment result callback, affiliate return redirect records

## Mandatory Flow

1. Affiliate backend calls `POST /api/intake/orders`
2. Request includes affiliate identifier, buyer info, product info, external reference, timestamp, nonce, and signature
3. Backend validates affiliate, signature, allowed product, and idempotency
4. Backend randomly selects one active landing domain from that affiliate's assigned pool
5. Backend creates order in `draft` state and returns `landingUrl=https://<domain>/?token=<token>`
6. Buyer opens landing URL
7. Homepage validates token, loads order snapshot, records visit, and immediately auto-redirects to `/checkout/redirect?token=...`
8. Backend creates Stripe session using the Stripe account bound to that landing domain
9. Buyer pays on Stripe hosted checkout
10. Stripe webhook updates order to `paid`, `failed`, or `expired`
11. Success/failure page displays on the same landing domain
12. If the order carries an approved affiliate return URL, success, failure, and cancel pages immediately auto-redirect back to the affiliate site after the landing-domain callback is recorded

## Order Statuses

- `draft`: intake accepted, not yet opened or not yet redirected
- `landing_visited`: homepage opened successfully
- `checkout_created`: Stripe checkout session created
- `paid`: payment succeeded
- `failed`: payment failed
- `expired`: token or checkout expired
- `canceled`: user canceled before payment

## Security Rules

- Intake API must require HMAC signature
- Intake API must require timestamp freshness and nonce replay prevention
- Token must be signed, short-lived, and reference a server-side order
- Stripe credentials must never be exposed to affiliate admins
- Stripe webhook verification must be per domain/account mapping
- Homepage token must be single-order scoped and refuse domain mismatch
- Any post-payment redirect back to the affiliate site must use a strict allowlist to avoid open redirect abuse
- No manual return link should be shown on the payment result pages in the MVP flow
- Logs must include operator identity where applicable, timestamps, affiliate, landing domain, order id, result status, request metadata, and failure reasons

## Delivery Phases

### Task 1: Bootstrap the application skeleton

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/lib/env.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/i18n.ts`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

**Step 1: Write the failing test**

Create `tests/smoke/app-shell.test.ts` asserting the root app module loads and exports a valid layout.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/smoke/app-shell.test.ts`
Expected: FAIL because app files do not exist yet.

**Step 3: Write minimal implementation**

Initialize a Next.js TypeScript app with Tailwind, shared env parsing, Prisma client bootstrap, and placeholder root page.

Add locale scaffolding with:
- English storefront copy
- Chinese admin/back-office copy

Also define storefront template slots and a template resolver keyed by landing domain.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/smoke/app-shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap mall saas application"
```

### Task 2: Define Prisma schema and initial migrations

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/*`
- Create: `src/lib/orders/types.ts`
- Create: `tests/db/schema.test.ts`

**Step 1: Write the failing test**

Create `tests/db/schema.test.ts` asserting the Prisma schema contains affiliate, landing domain, stripe account, order, and payment session models with required foreign keys.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/db/schema.test.ts`
Expected: FAIL because schema is missing.

**Step 3: Write minimal implementation**

Add Prisma models for:
- user
- affiliate
- affiliateMembership
- landingDomain
- domainTemplate
- stripeAccount
- product
- order
- paymentSession
- intakeRequest
- auditLog
- redirectLog

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/db/schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prisma src/lib/orders tests/db
git commit -m "feat: add multi-tenant commerce schema"
```

### Task 3: Seed product catalog from provided source file

**Files:**
- Create: `scripts/seed-products.ts`
- Create: `src/lib/products/catalog.ts`
- Create: `tests/products/seed-products.test.ts`
- Use source: `B站商品资料.txt`

**Step 1: Write the failing test**

Create `tests/products/seed-products.test.ts` asserting the parser loads four products and preserves `id`, `name`, `price`, `currency`, and `features`.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/products/seed-products.test.ts`
Expected: FAIL because parser does not exist.

**Step 3: Write minimal implementation**

Implement a parser/seed script that reads the JSON payload in `B站商品资料.txt` and upserts products into the database.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/products/seed-products.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts src/lib/products tests/products
git commit -m "feat: seed product catalog from source file"
```

### Task 4: Implement authentication and role gates

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth/roles.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/middleware.ts`
- Create: `tests/auth/roles.test.ts`

**Step 1: Write the failing test**

Create `tests/auth/roles.test.ts` asserting super admins can access `/admin`, affiliate admins can access `/affiliate`, and affiliate admins are blocked from super admin routes.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/auth/roles.test.ts`
Expected: FAIL because auth gates do not exist.

**Step 3: Write minimal implementation**

Configure Auth.js credentials or email login, session enrichment with role + affiliate id, and route protection middleware.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/auth/roles.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app src/lib/auth src/middleware.ts tests/auth
git commit -m "feat: add auth and admin role guards"
```

### Task 5: Build super admin domain and Stripe mapping management

**Files:**
- Create: `src/app/admin/affiliates/page.tsx`
- Create: `src/app/admin/domains/page.tsx`
- Create: `src/app/admin/stripe/page.tsx`
- Create: `src/app/api/admin/affiliates/route.ts`
- Create: `src/app/api/admin/domains/route.ts`
- Create: `src/app/api/admin/stripe/route.ts`
- Create: `src/lib/admin/domain-assignment.ts`
- Create: `tests/admin/domain-assignment.test.ts`

**Step 1: Write the failing test**

Create `tests/admin/domain-assignment.test.ts` asserting:
- a domain can only belong to one affiliate at a time
- each domain must reference exactly one Stripe account
- inactive domains are excluded from allocation

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/admin/domain-assignment.test.ts`
Expected: FAIL because management logic is missing.

**Step 3: Write minimal implementation**

Build admin CRUD to:
- create affiliates
- assign domain pools to affiliates
- bind a Stripe account config to each domain
- activate/deactivate domains
- configure allowed post-payment return URLs for each affiliate
- assign storefront template `A`, `B`, or `C` per domain

Admin pages and forms should use Chinese UI copy.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/admin/domain-assignment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/admin src/app/api/admin src/lib/admin tests/admin
git commit -m "feat: add tenant domain and stripe mapping management"
```

### Task 6: Build intake API with signature, idempotency, and domain allocation

**Files:**
- Create: `src/app/api/intake/orders/route.ts`
- Create: `src/lib/intake/schema.ts`
- Create: `src/lib/intake/verify-signature.ts`
- Create: `src/lib/intake/idempotency.ts`
- Create: `src/lib/intake/allocate-domain.ts`
- Create: `src/lib/intake/create-order.ts`
- Create: `tests/intake/orders-route.test.ts`

**Step 1: Write the failing test**

Create `tests/intake/orders-route.test.ts` asserting:
- valid signed requests create one `draft` order
- duplicate external references do not create duplicate orders
- selected landing domain belongs to the affiliate
- response includes `landingUrl` with token

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/intake/orders-route.test.ts`
Expected: FAIL because intake route is missing.

**Step 3: Write minimal implementation**

Implement intake validation with Zod, HMAC verification, nonce/timestamp checks, domain allocation, order creation, and token issuance.

The intake contract should also support:
- `totalAmount` from affiliate payload as payment authority
- optional `returnUrl`, accepted only if it matches the affiliate allowlist
- automatic callback parameters appended during redirect, for example `?orderId=...&status=paid|failed|canceled`

The intake pipeline should write detailed logs for:
- raw request receipt
- signature pass/fail
- idempotency hit/miss
- domain allocation result
- order creation result

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/intake/orders-route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/intake src/lib/intake tests/intake
git commit -m "feat: add signed intake api and order creation"
```

### Task 7: Build forced two-step landing flow

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/checkout/redirect/page.tsx`
- Create: `src/app/payment/success/page.tsx`
- Create: `src/app/payment/failure/page.tsx`
- Create: `src/lib/tokens/order-token.ts`
- Create: `src/lib/orders/load-checkout-context.ts`
- Create: `tests/storefront/landing-flow.test.ts`

**Step 1: Write the failing test**

Create `tests/storefront/landing-flow.test.ts` asserting:
- homepage requires a valid token
- homepage marks order as `landing_visited`
- homepage renders a short loading/verification state
- redirect page creates checkout only after homepage load

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/storefront/landing-flow.test.ts`
Expected: FAIL because storefront flow is missing.

**Step 3: Write minimal implementation**

Implement homepage token validation, minimal buyer summary for server-side verification only, immediate client redirect to checkout route, and status transitions.

Storefront copy must be English-only.

The redirect flow should write detailed logs for:
- landing page opened
- token validation success/failure
- checkout session creation attempt
- checkout redirect dispatched

The storefront rendering layer should:
- resolve the current domain template
- use template `A` when no domain override exists
- support three structurally distinct layouts optimized for cleaning products

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/storefront/landing-flow.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app src/lib/tokens src/lib/orders tests/storefront
git commit -m "feat: add forced landing to checkout redirect flow"
```

### Task 8: Integrate per-domain Stripe checkout

**Files:**
- Create: `src/lib/stripe/client-factory.ts`
- Create: `src/lib/stripe/create-checkout-session.ts`
- Create: `src/app/api/stripe/webhooks/route.ts`
- Create: `src/lib/stripe/webhook-resolver.ts`
- Create: `tests/stripe/checkout.test.ts`
- Create: `tests/stripe/webhook.test.ts`

**Step 1: Write the failing test**

Create tests asserting:
- checkout session uses the Stripe config bound to the order's landing domain
- success/failure URLs stay on the same landing domain
- webhook updates the correct order and payment session

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/stripe/checkout.test.ts tests/stripe/webhook.test.ts`
Expected: FAIL because Stripe integration is missing.

**Step 3: Write minimal implementation**

Implement Stripe client resolution per domain, checkout session creation, metadata propagation, and webhook processing.

The Stripe success, failure, and cancel URLs must always return to the same assigned landing domain first. From those pages, the app immediately auto-redirects to a validated affiliate `returnUrl`.

Payment and callback logs should capture:
- Stripe session id
- payment intent id
- webhook event id
- resolved order id
- redirect-to-affiliate result

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/stripe/checkout.test.ts tests/stripe/webhook.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stripe src/app/api/stripe tests/stripe
git commit -m "feat: add per-domain stripe checkout and webhook handling"
```

### Task 9: Build multi-template storefront system

**Files:**
- Create: `src/lib/storefront/template-resolver.ts`
- Create: `src/lib/storefront/theme-tokens.ts`
- Create: `src/components/storefront/template-a.tsx`
- Create: `src/components/storefront/template-b.tsx`
- Create: `src/components/storefront/template-c.tsx`
- Create: `src/components/storefront/storefront-shell.tsx`
- Create: `tests/storefront/template-resolver.test.ts`

**Step 1: Write the failing test**

Create `tests/storefront/template-resolver.test.ts` asserting:
- explicit domain template assignments resolve correctly
- unassigned domains fall back to template `A`
- unsupported values are rejected

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/storefront/template-resolver.test.ts`
Expected: FAIL because template resolver does not exist.

**Step 3: Write minimal implementation**

Implement:
- template resolver from landing domain to `A|B|C`
- Template `A`: warm home-care aesthetic, soft neutral palette, trust-first conversion layout
- Template `B`: editorial product story layout with stronger feature storytelling
- Template `C`: promotional conversion layout with stronger urgency and CTA rhythm

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/storefront/template-resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/storefront src/components/storefront tests/storefront
git commit -m "feat: add domain-based storefront templates"
```

### Task 10: Build affiliate admin for order visibility

**Files:**
- Create: `src/app/affiliate/page.tsx`
- Create: `src/app/affiliate/orders/page.tsx`
- Create: `src/app/api/affiliate/orders/route.ts`
- Create: `src/lib/affiliate/orders.ts`
- Create: `tests/affiliate/orders-scope.test.ts`

**Step 1: Write the failing test**

Create `tests/affiliate/orders-scope.test.ts` asserting affiliate admins only see orders tied to their assigned domains and cannot query other tenants by id.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/affiliate/orders-scope.test.ts`
Expected: FAIL because scoped order queries are missing.

**Step 3: Write minimal implementation**

Build affiliate dashboard with:
- order list
- status filters: paid, failed, draft, expired
- search by external reference or buyer email
- domain-level grouping
- source return URL visibility for customer service tracing

Affiliate dashboard UI should be Chinese-only.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/affiliate/orders-scope.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/affiliate src/app/api/affiliate src/lib/affiliate tests/affiliate
git commit -m "feat: add affiliate order dashboard with tenant scoping"
```

### Task 11: Add observability, retries, and operations safeguards

**Files:**
- Create: `src/lib/logging/audit.ts`
- Create: `src/lib/logging/intake-log.ts`
- Create: `src/lib/monitoring/order-health.ts`
- Create: `src/app/admin/orders/page.tsx`
- Create: `tests/ops/order-health.test.ts`
- Create: `README.md`

**Step 1: Write the failing test**

Create `tests/ops/order-health.test.ts` asserting stale `draft` and `checkout_created` orders can be detected for manual review.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/ops/order-health.test.ts`
Expected: FAIL because operations checks are missing.

**Step 3: Write minimal implementation**

Add:
- intake and admin audit logging
- stale order report
- admin global order list
- detailed log explorer for super admin with filters by order id, affiliate, domain, status, and event type
- setup and deployment instructions

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/ops/order-health.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/logging src/lib/monitoring src/app/admin/orders README.md tests/ops
git commit -m "feat: add operational monitoring and documentation"
```

## API Contract Draft

### `POST /api/intake/orders`

Request body draft:

```json
{
  "affiliateCode": "AFF_001",
  "externalOrderId": "AAA-20260316-0001",
  "timestamp": 1773648000,
  "nonce": "8e995f6d-2d26-48d7-85ad-0f19f5f69b27",
  "buyer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+15550000000",
    "country": "US",
    "state": "CA",
    "city": "Los Angeles",
    "address1": "123 Main St",
    "address2": "",
    "postalCode": "90001"
  },
  "totalAmount": 29.99,
  "currency": "USD",
  "items": [
    {
      "productId": "clean001",
      "quantity": 1,
      "unitPrice": 29.99
    }
  ],
  "returnUrl": "https://aaa.com/order-complete",
  "signature": "<hmac>"
}
```

Response draft:

```json
{
  "orderId": "ord_xxx",
  "token": "tok_xxx",
  "landingDomain": "pay-a1.example.com",
  "landingUrl": "https://pay-a1.example.com/?token=tok_xxx",
  "expiresAt": "2026-03-16T12:00:00.000Z"
}
```

## Open Decisions To Confirm Before Implementation

## Suggested MVP Defaults If Unanswered

- Use independent Stripe accounts per domain
- Domain allocation uses random active domain selection
- Backend uses API-sent total amount as payment authority and records item detail as submitted
- Require full shipping address in the intake API
- Return to the landing domain first, then immediately auto-redirect to affiliate `returnUrl` on `paid`, `failed`, and `canceled`

## UI Language Rules

- Storefront homepage, loading state, payment result bridge pages, and customer-facing error pages use English
- Super admin pages use Simplified Chinese
- Affiliate admin pages use Simplified Chinese
- System log fields may remain in English internally, but UI labels and filters should be Chinese in admin views

## Storefront Template Rules

- Template assignment is resolved by landing domain
- Template `A` is the default fallback
- Template `A` uses a warm, home-care direction suitable for cleaning tools
- Template `B` should emphasize editorial storytelling and product detail credibility
- Template `C` should emphasize promotional urgency and fast checkout momentum
- All three templates must support the same payment redirect flow and buyer/order context

## Super Admin Log Requirements

The super admin log explorer should support at minimum:

- filter by time range
- filter by affiliate
- filter by landing domain
- filter by order id
- filter by external order id
- filter by event type
- filter by status
- keyword search on error message

Each log entry should include:

- event type
- event time
- operator or system actor
- affiliate id / code
- landing domain
- order id
- external order id
- result status
- error or rejection reason
- structured metadata payload
