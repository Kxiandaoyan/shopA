import { OrderStatus } from "@prisma/client";

export type AffiliateReturnStatus = "paid" | "failed" | "expired" | "canceled";

export function resolveAffiliateReturnStatus(
  status: OrderStatus,
): AffiliateReturnStatus | null {
  switch (status) {
    case OrderStatus.PAID:
      return "paid";
    case OrderStatus.FAILED:
      return "failed";
    case OrderStatus.EXPIRED:
      return "expired";
    case OrderStatus.CANCELED:
      return "canceled";
    default:
      return null;
  }
}
