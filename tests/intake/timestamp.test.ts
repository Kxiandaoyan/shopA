import { describe, expect, it } from "vitest";
import { getIntakeMaxSkewSeconds, isIntakeTimestampFresh } from "@/lib/intake/timestamp";

describe("isIntakeTimestampFresh", () => {
  it("accepts timestamps inside the allowed skew window", () => {
    expect(isIntakeTimestampFresh(1_700_000_000, 1_700_000_100)).toBe(true);
  });

  it("rejects timestamps older than the allowed skew window", () => {
    const now = 1_700_000_000;
    expect(isIntakeTimestampFresh(now - getIntakeMaxSkewSeconds() - 1, now)).toBe(false);
  });

  it("rejects timestamps too far in the future", () => {
    const now = 1_700_000_000;
    expect(isIntakeTimestampFresh(now + getIntakeMaxSkewSeconds() + 1, now)).toBe(false);
  });
});
