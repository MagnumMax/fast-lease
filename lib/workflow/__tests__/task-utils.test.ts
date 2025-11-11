import { describe, expect, it } from "vitest";

import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";

describe("resolveTaskGuardKey", () => {
  it("uses explicit guard key from payload when provided", () => {
    expect(
      resolveTaskGuardKey({
        type: "PREPARE_QUOTE",
        payload: { guard_key: "custom.rule" },
      }),
    ).toBe("custom.rule");
  });

  it("falls back to task type mapping when payload is missing the hint", () => {
    expect(resolveTaskGuardKey({ type: "VERIFY_VEHICLE" })).toBe("vehicle.verified");
    expect(resolveTaskGuardKey({ type: "PAY_SUPPLIER" })).toBe("payments.supplierPaid");
  });

  it("returns null for unknown types and empty payloads", () => {
    expect(resolveTaskGuardKey({ type: "UNKNOWN" })).toBeNull();
    expect(resolveTaskGuardKey({ payload: {} })).toBeNull();
  });
});
