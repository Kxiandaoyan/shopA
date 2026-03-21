import { LogResult, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type RedirectEventInput = {
  orderId?: string;
  landingDomainId?: string;
  eventType: string;
  result?: LogResult;
  status?: string;
  requestUrl?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export async function writeRedirectLog(input: RedirectEventInput) {
  try {
    await db.redirectLog.create({
      data: {
        orderId: input.orderId,
        landingDomainId: input.landingDomainId,
        eventType: input.eventType,
        result: input.result ?? LogResult.INFO,
        status: input.status,
        requestUrl: input.requestUrl,
        message: input.message,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Logging must not break the core flow during early bootstrap.
  }
}
