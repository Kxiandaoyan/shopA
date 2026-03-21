import { LogResult, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { productAdminSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = productAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const product = await db.product.upsert({
    where: { id: parsed.data.id },
    update: {
      name: parsed.data.name,
      category: parsed.data.category,
      price: new Prisma.Decimal(parsed.data.price),
      currency: parsed.data.currency,
      image: parsed.data.image,
      description: parsed.data.description,
      features: parsed.data.features,
    },
    create: {
      id: parsed.data.id,
      name: parsed.data.name,
      category: parsed.data.category,
      price: new Prisma.Decimal(parsed.data.price),
      currency: parsed.data.currency,
      image: parsed.data.image,
      description: parsed.data.description,
      features: parsed.data.features,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.product_created",
    result: LogResult.SUCCESS,
    targetType: "product",
    targetId: product.id,
    metadata: {
      id: product.id,
      name: product.name,
      currency: product.currency,
      price: parsed.data.price,
    },
  });

  return NextResponse.json({ ok: true, productId: product.id });
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = productAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const product = await db.product.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      price: new Prisma.Decimal(parsed.data.price),
      currency: parsed.data.currency,
      image: parsed.data.image,
      description: parsed.data.description,
      features: parsed.data.features,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.product_updated",
    result: LogResult.SUCCESS,
    targetType: "product",
    targetId: product.id,
    metadata: {
      id: product.id,
      name: product.name,
      currency: product.currency,
      price: parsed.data.price,
    },
  });

  return NextResponse.json({ ok: true, productId: product.id });
}
