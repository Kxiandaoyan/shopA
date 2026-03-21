import { NextResponse } from "next/server";
import {
  processWebhookEvent,
  resolveWebhookEventForAccount,
} from "@/lib/stripe/webhook";

type WebhookRouteProps = {
  params: Promise<{
    accountId: string;
  }>;
};

export async function POST(request: Request, { params }: WebhookRouteProps) {
  const { accountId } = await params;
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing stripe signature" }, { status: 400 });
  }

  const payload = await request.text();
  const resolved = await resolveWebhookEventForAccount(accountId, payload, signature);

  if (!resolved) {
    return NextResponse.json(
      { ok: false, message: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  await processWebhookEvent(resolved);

  return NextResponse.json({ ok: true });
}
