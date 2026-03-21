import { describe, expect, it } from "vitest";
import {
  buildAdminLogWhere,
  normalizeAdminLogFilters,
} from "@/lib/admin/log-filters";

describe("admin log filters", () => {
  it("normalizes known result values", () => {
    const filters = normalizeAdminLogFilters({
      result: "FAILURE",
      eventType: "checkout",
    });

    expect(filters).toEqual({
      eventType: "checkout",
      result: "FAILURE",
      query: undefined,
      orderId: undefined,
      domain: undefined,
    });
  });

  it("builds a where clause with domain and search query", () => {
    const where = buildAdminLogWhere({
      domain: "pay-a",
      query: "signature",
    });

    expect(where).toHaveProperty("AND");
  });
});
