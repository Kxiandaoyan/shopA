import { LogResult, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditLogInput = {
  actorId?: string;
  eventType: string;
  result?: LogResult;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        eventType: input.eventType,
        result: input.result ?? LogResult.INFO,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Bootstrap-safe logging.
  }
}
