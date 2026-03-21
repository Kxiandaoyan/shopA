import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";

const noteSchema = z.object({
  note: z.string().trim().min(2).max(2000),
});

type NoteRouteProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(request: Request, { params }: NoteRouteProps) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { orderId } = await params;
  const body = await request.json();
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "备注内容不合法。", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, message: "订单不存在。" }, { status: 404 });
  }

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.order_note_added",
    result: LogResult.INFO,
    targetType: "order",
    targetId: orderId,
    metadata: {
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ ok: true });
}
