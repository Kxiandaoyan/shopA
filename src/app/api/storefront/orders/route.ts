import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createDirectStorefrontOrder } from "@/lib/storefront/direct-order";
import { directOrderSchema } from "@/lib/storefront/direct-order-schema";

export async function POST(request: Request) {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const body = await request.json();
  const parsed = directOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid order payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await createDirectStorefrontOrder({
    host,
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
    buyer: parsed.data.buyer,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(result);
}
