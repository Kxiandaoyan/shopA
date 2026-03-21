import { describe, expect, it } from "vitest";
import { resolveResyncTargetState } from "@/lib/stripe/order-resync";

describe("resolveResyncTargetState", () => {
  it("maps paid sessions to successful state", () => {
    const result = resolveResyncTargetState({
      status: "complete",
      payment_status: "paid",
    });

    expect(result.kind).toBe("state");
    if (result.kind === "state") {
      expect(result.orderStatus).toBe("PAID");
      expect(result.paymentStatus).toBe("SUCCEEDED");
    }
  });

  it("maps expired sessions to expired state", () => {
    const result = resolveResyncTargetState({
      status: "expired",
      payment_status: "unpaid",
    });

    expect(result.kind).toBe("state");
    if (result.kind === "state") {
      expect(result.orderStatus).toBe("EXPIRED");
      expect(result.paymentStatus).toBe("EXPIRED");
    }
  });

  it("keeps open sessions as no-op", () => {
    const result = resolveResyncTargetState({
      status: "open",
      payment_status: "unpaid",
    });

    expect(result.kind).toBe("noop");
  });
});
