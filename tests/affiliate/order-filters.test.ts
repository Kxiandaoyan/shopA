import { describe, expect, it } from "vitest";
import {
  buildAffiliateOrderWhere,
  normalizeAffiliateOrderFilters,
} from "@/lib/affiliate/order-filters";

describe("affiliate order filters", () => {
  it("normalizes supported filters", () => {
    const filters = normalizeAffiliateOrderFilters({
      status: "PAID",
      query: "abc",
      domain: "pay-a",
    });

    expect(filters).toEqual({
      status: "PAID",
      query: "abc",
      domain: "pay-a",
    });
  });

  it("builds a scoped where clause", () => {
    const where = buildAffiliateOrderWhere(["aff_1"], {
      status: "FAILED",
      query: "john@example.com",
    });

    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        {
          affiliateId: {
            in: ["aff_1"],
          },
        },
        {
          status: "FAILED",
        },
      ]),
    });
  });
});
