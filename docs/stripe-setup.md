# Stripe Setup Guide

## Overview

This system uses Stripe hosted checkout, not inline card collection.

The required flow is:

1. Affiliate API creates an order
2. System assigns a landing domain
3. Buyer lands on the homepage for that domain
4. Homepage auto-redirects to Stripe checkout
5. Stripe returns to the same landing domain
6. App records the callback and auto-redirects to the affiliate `returnUrl`

## Why Webhooks Are Required

Although Stripe can expose client-visible status, this system must use webhooks as the source of truth because:

- buyers may never return from Stripe to your site
- network interruptions can break client-side confirmation
- order state must be updated reliably for admin reporting
- each domain is tied to a separate Stripe credential set

## Account Model

This project uses:

- one independent Stripe secret key set per landing domain
- one webhook signing secret per Stripe account / endpoint

It does not assume Stripe Connect.

## Required Stripe Configuration Per Domain

For each landing domain, store:

- Stripe secret key
- Stripe publishable key if later needed for limited client features
- webhook signing secret
- account label for operator clarity
- active / inactive status

## Checkout Return URLs

For each payment session:

- `success_url` must point to the assigned landing domain
- `cancel_url` must point to the assigned landing domain
- failure handling must also resolve on the landing domain

Example pattern:

- `https://domain-a.example.com/payment/success?token=...`
- `https://domain-a.example.com/payment/cancel?token=...`

The app must never send buyers directly back to the affiliate site from Stripe. It must return to your landing domain first.

## Signed Affiliate Redirect

The redirect from your landing domain back to the affiliate site should not be trusted by query parameters alone.

This project now signs the callback with an affiliate-specific secret and appends:

- `affiliateCode`
- `orderId`
- `externalOrderId`
- `status`
- `ts`
- `sig`

If `sig` is present, affiliates should verify it before treating the order as confirmed. If no callback secret is configured, the redirect still happens but without the signed fields.

## Webhook Endpoint

Recommended endpoint per Stripe account:

- `POST /api/stripe/webhooks/{stripeAccountId}`

The generic `POST /api/stripe/webhooks` endpoint should only be used for local or single-account fallback scenarios.

The webhook handler must:

- verify the Stripe signature
- resolve the exact Stripe account from the route
- locate the order by session metadata
- verify the payment session belongs to that same Stripe account and landing domain
- update order and payment session status
- write detailed logs

## Required Stripe Events

At minimum, handle:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Depending on final implementation, `charge.succeeded` may be logged but does not need to be the primary source of truth.

## Metadata Recommendation

Every Stripe checkout session should include metadata for:

- `orderId`
- `landingDomainId`
- `token`

This makes reconciliation and logging much easier.

## Testing Checklist

For each domain:

1. Trigger a successful payment with Stripe test cards.
2. Trigger a failed payment with Stripe test cards.
3. Trigger a user cancel flow.
4. Confirm Stripe returns to the same landing domain.
5. Confirm the app auto-redirects to the configured affiliate `returnUrl`.
6. Confirm webhook updates the order state correctly.
7. Confirm the super admin logs show the full chain.
8. Confirm each Stripe account is using its own `/api/stripe/webhooks/{stripeAccountId}` path.

## Security Notes

- Never put Stripe secret keys in frontend code.
- Restrict Stripe key management to the super admin backend only.
- Encrypt stored Stripe secrets at rest if possible.
- Rotate keys and webhook secrets with audit logs.
- Treat webhook signature verification as mandatory.
