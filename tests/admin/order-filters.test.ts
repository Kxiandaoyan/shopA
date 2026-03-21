import { describe, expect, it } from "vitest";
import {
  buildAdminOrderWhere,
  normalizeAdminOrderFilters,
} from "@/lib/admin/order-filters";

describe("admin order filters", () => {
  it("normalizes supported fields", () => {
    const filters = normalizeAdminOrderFilters({
      orderId: " ord_1 ",
      externalOrderId: " ext_1 ",
      affiliate: " aff ",
      domain: " pay-a ",
      buyer: " john@example.com ",
      status: "PAID",
      source: "direct",
    });

    expect(filters).toEqual({
      orderId: "ord_1",
      externalOrderId: "ext_1",
      affiliate: "aff",
      domain: "pay-a",
      buyer: "john@example.com",
      status: "PAID",
      source: "direct",
    });
  });

  it("builds direct source and buyer search clauses", () => {
    const where = buildAdminOrderWhere({
      buyer: "john",
      source: "direct",
      status: "FAILED",
    });

    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        { status: "FAILED" },
        {
          affiliate: {
            is: {
              code: "STORE_DIRECT",
            },
          },
        },
      ]),
    });
  });

  it("builds affiliate source exclusion clause", () => {
    const where = buildAdminOrderWhere({
      source: "affiliate",
    });

    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        {
          NOT: {
            affiliate: {
              is: {
                code: "STORE_DIRECT",
              },
            },
          },
        },
      ]),
    });
  });
});
