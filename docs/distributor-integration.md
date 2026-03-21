# Distributor Integration Guide

## Overview

Distributors integrate in three places:

1. Server-to-server order intake
2. Browser return callback handling
3. Async webhook handling

The intake request should always be signed with the affiliate's own intake secret. The callback redirect should also be verified when `sig` is present.

Affiliate goods and prices do not need to match the storefront catalog. For affiliate intake orders, the final Stripe payment amount follows `totalAmount`; imported `items` are retained for recordkeeping and display.

## 1. Intake API

### Endpoint

```text
POST /api/intake/orders
```

### Request Example

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
      "name": "SmartSpray Microfiber Floor Mop",
      "quantity": 1,
      "unitPrice": 29.99
    }
  ],
  "returnUrl": "https://aaa.com/order-complete",
  "signature": "<hmac>"
}
```

### Intake Signature

Remove `signature`, stringify the remaining JSON payload, then compute:

```text
HMAC-SHA256(JSON.stringify(payload_without_signature), affiliate_intake_secret)
```

Reference implementation:

- [verify-signature.ts](/D:/Code_Space/shopA/src/lib/intake/verify-signature.ts)

### Intake Rules

- `timestamp` must be fresh
- `nonce` must be unique per affiliate
- `returnUrl` must already be allowlisted in the admin backend
- buyer payload must include the full shipping address
- each affiliate must use its own intake secret configured in the admin backend
- `totalAmount` is the authoritative payment amount for affiliate intake orders

### Node.js Signing Example

```js
import crypto from "node:crypto";

const payload = {
  affiliateCode: "AFF_001",
  externalOrderId: "AAA-20260316-0001",
  timestamp: 1773648000,
  nonce: "8e995f6d-2d26-48d7-85ad-0f19f5f69b27",
  buyer: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+15550000000",
    country: "US",
    state: "CA",
    city: "Los Angeles",
    address1: "123 Main St",
    address2: "",
    postalCode: "90001"
  },
  totalAmount: 29.99,
  currency: "USD",
  items: [
    {
      productId: "clean001",
      name: "SmartSpray Microfiber Floor Mop",
      quantity: 1,
      unitPrice: 29.99
    }
  ],
  returnUrl: "https://aaa.com/order-complete"
};

const signature = crypto
  .createHmac("sha256", "your-affiliate-intake-secret")
  .update(JSON.stringify(payload))
  .digest("hex");

const requestBody = {
  ...payload,
  signature,
};
```

### Success Response

```json
{
  "ok": true,
  "orderId": "ord_xxx",
  "token": "tok_xxx",
  "landingDomain": "pay-a1.example.com",
  "landingUrl": "https://pay-a1.example.com/?token=tok_xxx"
}
```

Redirect the buyer to `landingUrl`.

## 2. Callback Redirect

After Stripe finishes, the buyer returns to the assigned landing domain first. Only after the local result is recorded does the app redirect to your `returnUrl`.

This browser redirect remains active in production. The system also sends a separate async webhook `POST` request to each configured affiliate webhook endpoint for terminal order states. The admin backend can manually resend both the browser callback and the async webhook when operational recovery is needed.

## 3. Async Webhook

### Method

```text
POST {affiliate_webhook_url}
```

### Event

```text
order.status_changed
```

### Body Fields

- `event`
- `affiliateCode`
- `orderId`
- `externalOrderId`
- `status`
- `amount`
- `currency`
- `ts`
- `landingDomain`
- `buyer`
- `items`
- `sig` when callback secret is configured

### Signature Rule

Sign this exact string:

```text
event.affiliateCode.orderId.externalOrderId.status.amount.currency.ts
```

Then compute:

```text
HMAC-SHA256(raw_string, callback_secret)
```

### Always Included

- `affiliateCode`
- `orderId`
- `externalOrderId`
- `status`

Example:

```text
https://aaa.com/order-complete?affiliateCode=AFF_001&orderId=ord_123&externalOrderId=AAA-20260316-0001&status=paid
```

### Included When Callback Secret Is Configured

- `ts`
- `sig`

Example:

```text
https://aaa.com/order-complete?affiliateCode=AFF_001&orderId=ord_123&externalOrderId=AAA-20260316-0001&status=paid&ts=1773648000&sig=abcdef...
```

Reference implementation:

- [callback-signature.ts](/D:/Code_Space/shopA/src/lib/affiliate/callback-signature.ts)

### Callback Signature Rule

Sign this exact string:

```text
affiliateCode.orderId.externalOrderId.status.ts
```

Then compute:

```text
HMAC-SHA256(raw_string, callback_secret)
```

## 3. Verify Callback Signature

### Node.js

```js
import crypto from "node:crypto";

function verifyCallback(params, secret) {
  const raw = [
    params.affiliateCode,
    params.orderId,
    params.externalOrderId,
    params.status,
    params.ts,
  ].join(".");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  if (expected.length !== params.sig.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(params.sig, "hex"),
  );
}
```

### Python

```python
import hashlib
import hmac

def verify_callback(params, secret: str) -> bool:
    raw = ".".join([
        params["affiliateCode"],
        params["orderId"],
        params["externalOrderId"],
        params["status"],
        params["ts"],
    ])

    expected = hmac.new(
        secret.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, params["sig"])
```

### PHP

```php
<?php
function verifyCallback(array $params, string $secret): bool {
    $raw = implode(".", [
        $params["affiliateCode"],
        $params["orderId"],
        $params["externalOrderId"],
        $params["status"],
        $params["ts"],
    ]);

    $expected = hash_hmac("sha256", $raw, $secret);
    return hash_equals($expected, $params["sig"]);
}
```

## 4. Replay Protection

When signed callback mode is enabled, the distributor should also:

1. Reject callbacks with stale `ts` older than 5 minutes
2. Process each `orderId` or `externalOrderId` only once

## 5. Recommended Handling

1. If `sig` exists, verify it first
2. If verification fails, reject the callback update
3. If `sig` does not exist, treat the redirect as informational only
4. For sensitive business logic, combine this redirect with server-side reconciliation

## 6. Status Values

Possible `status` values:

- `paid`
- `failed`
- `canceled`
- `expired`

## 7. Local Testing

Generate a signed sample payload:

```bash
npm run sample:intake
```

Custom example:

```bash
$env:SAMPLE_INTAKE_SECRET="your-affiliate-intake-secret"
$env:SAMPLE_AFFILIATE_CODE="AFF_DEMO"
$env:SAMPLE_RETURN_URL="https://aaa.com/order-complete"
npm run sample:intake
```

Then post the generated JSON:

```bash
curl -X POST http://localhost:3000/api/intake/orders ^
  -H "Content-Type: application/json" ^
  --data-binary "@payload.json"
```
