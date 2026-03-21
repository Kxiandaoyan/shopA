# Stability And Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the existing B2C SaaS mall without changing the business flow: keep intake -> landing -> Stripe -> landing callback -> affiliate return intact while fixing replay, idempotency, webhook, checkout reuse, and admin consistency gaps.

**Architecture:** Keep the current single-app Next.js + Prisma structure. Add targeted schema constraints, stricter request validation, decrypted Stripe webhook resolution, session-to-order verification, and safer admin update semantics. Avoid introducing new external services or changing frontend business behavior.

**Tech Stack:** Next.js 16, TypeScript, PostgreSQL, Prisma 7, Stripe Checkout, Vitest

---

### Task 1: Fix payment integrity

**Files:**
- Modify: `src/lib/stripe/webhook.ts`
- Modify: `src/app/payment/success/page.tsx`
- Modify: `src/lib/stripe/client.ts`
- Test: `tests/stripe/*.test.ts`

**Step 1:**
Decrypt Stripe secrets before webhook verification.

**Step 2:**
Verify that the Stripe session metadata matches the current order before marking payment success.

**Step 3:**
Log mismatches and refuse unsafe success transitions.

### Task 2: Harden intake replay and idempotency

**Files:**
- Modify: `src/app/api/intake/orders/route.ts`
- Modify: `src/lib/intake/*`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/20260316_init/migration.sql`
- Test: `tests/intake/*`

**Step 1:**
Enforce timestamp freshness.

**Step 2:**
Enforce nonce one-time usage per affiliate.

**Step 3:**
Catch duplicate create races and reuse existing orders instead of failing.

### Task 3: Reuse checkout sessions

**Files:**
- Modify: `src/lib/stripe/checkout.ts`
- Modify: `src/app/checkout/redirect/page.tsx`
- Test: `tests/stripe/*.test.ts`

**Step 1:**
Reuse the latest open Stripe Checkout Session for the same order when possible.

**Step 2:**
Avoid new sessions for already-paid orders.

### Task 4: Fix admin update consistency

**Files:**
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/admin/stripe/route.ts`
- Modify: `src/app/api/admin/affiliates/route.ts`
- Modify: `src/app/api/admin/domains/route.ts`
- Test: `tests/auth/*`, `tests/admin/*`

**Step 1:**
Normalize broken/garbled error strings.

**Step 2:**
When updating affiliate-admin users, replace outdated affiliate memberships instead of only adding new ones.

### Task 5: Verify and document

**Files:**
- Modify: `docs/deployment.md`
- Modify: `README.md`
- Test: `npm test`
- Test: `npm run build`

**Step 1:**
Regenerate Prisma client and migration SQL.

**Step 2:**
Run tests and production build.

**Step 3:**
Document the hardened behavior where needed.
