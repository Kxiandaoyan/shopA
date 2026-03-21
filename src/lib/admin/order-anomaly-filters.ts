import { OrderStatus } from "@prisma/client";
import type { AdminOrderAnomalyKind } from "@/lib/admin/orders";

export type AdminOrderAnomalySeverity = "medium" | "high";

export type AdminOrderAnomalyFilters = {
  query?: string;
  severity?: AdminOrderAnomalySeverity;
  kind?: AdminOrderAnomalyKind;
  status?: OrderStatus;
  domain?: string;
};

const validSeverities = new Set<AdminOrderAnomalySeverity>(["medium", "high"]);
const validKinds = new Set<AdminOrderAnomalyKind>([
  "STALE_DRAFT",
  "STALE_CHECKOUT",
  "CHECKOUT_WITHOUT_PAYMENT_SESSION",
  "ACTIVE_ORDER_WITHOUT_STRIPE_BINDING",
  "PAID_WITHOUT_SUCCESSFUL_PAYMENT",
  "FAILED_WITHOUT_PAYMENT_RECORD",
]);
const validStatuses = new Set<OrderStatus>(Object.values(OrderStatus));

export function normalizeAdminOrderAnomalyFilters(input: {
  query?: string;
  severity?: string;
  kind?: string;
  status?: string;
  domain?: string;
}): AdminOrderAnomalyFilters {
  const query = input.query?.trim() || undefined;
  const domain = input.domain?.trim() || undefined;
  const severity =
    input.severity && validSeverities.has(input.severity as AdminOrderAnomalySeverity)
      ? (input.severity as AdminOrderAnomalySeverity)
      : undefined;
  const kind =
    input.kind && validKinds.has(input.kind as AdminOrderAnomalyKind)
      ? (input.kind as AdminOrderAnomalyKind)
      : undefined;
  const status =
    input.status && validStatuses.has(input.status as OrderStatus)
      ? (input.status as OrderStatus)
      : undefined;

  return {
    query,
    severity,
    kind,
    status,
    domain,
  };
}
