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

  it("returns guard key when passed directly", () => {
    expect(resolveTaskGuardKey({ guardKey: "payload.rule" })).toBe("payload.rule");
  });

  it("returns null for unknown types and empty payloads", () => {
    expect(resolveTaskGuardKey({ type: "UNKNOWN" as any })).toBeNull();
    expect(resolveTaskGuardKey({ payload: {} })).toBeNull();
  });
});
