import { NextResponse } from "next/server";
import { processWebhookEvent, resolveWebhookEvent } from "@/lib/stripe/webhook";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing stripe signature" }, { status: 400 });
  }

  const payload = await request.text();
  const resolved = await resolveWebhookEvent(payload, signature);

  if (!resolved) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Generic webhook endpoint is disabled when multiple Stripe accounts are active. Configure /api/stripe/webhooks/{stripeAccountId} instead.",
      },
      { status: 400 },
    );
  }

  await processWebhookEvent(resolved);

  return NextResponse.json({ ok: true });
}
