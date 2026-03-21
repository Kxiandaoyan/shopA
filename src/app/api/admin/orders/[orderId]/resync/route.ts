import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { resyncOrderWithStripe } from "@/lib/stripe/order-resync";

type ResyncRouteProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(_request: Request, { params }: ResyncRouteProps) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { orderId } = await params;
  const result = await resyncOrderWithStripe(orderId, auth.session.sub);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
