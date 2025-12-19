import { describe, expect, it, vi } from "vitest";
import { computeSlaDueAt, resolvePath, parseConditionExpectedValue } from "../actions";

describe("workflow action utils", () => {
  describe("computeSlaDueAt", () => {
    it("returns null for undefined or NaN", () => {
      expect(computeSlaDueAt(undefined)).toBeNull();
      expect(computeSlaDueAt(NaN)).toBeNull();
    });

    it("calculates future date correctly", () => {
      const now = new Date("2024-01-01T10:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const result = computeSlaDueAt(2);
      expect(result).toBe("2024-01-01T12:00:00.000Z");

      vi.useRealTimers();
    });
  });

  describe("resolvePath", () => {
    const context = {
      foo: {
        bar: "baz",
        num: 123,
        nested: {
          val: true,
        },
      },
      arr: [1, 2],
    };

    it("resolves simple path", () => {
      expect(resolvePath(context, "foo")).toEqual(context.foo);
    });

    it("resolves nested path", () => {
      expect(resolvePath(context, "foo.bar")).toBe("baz");
      expect(resolvePath(context, "foo.nested.val")).toBe(true);
    });

    it("returns undefined for missing path", () => {
      expect(resolvePath(context, "foo.missing")).toBeUndefined();
      expect(resolvePath(context, "missing.bar")).toBeUndefined();
    });

    it("handles non-object intermediates gracefully", () => {
      expect(resolvePath(context, "foo.bar.baz")).toBeUndefined();
    });
  });

  describe("parseConditionExpectedValue", () => {
    it("parses booleans", () => {
      expect(parseConditionExpectedValue("true")).toBe(true);
      expect(parseConditionExpectedValue("false")).toBe(false);
    });

    it("parses null", () => {
      expect(parseConditionExpectedValue("null")).toBeNull();
    });

    it("parses numbers", () => {
      expect(parseConditionExpectedValue("123")).toBe(123);
      expect(parseConditionExpectedValue("12.34")).toBe(12.34);
    });

    it("returns string for non-special values", () => {
      expect(parseConditionExpectedValue("hello")).toBe("hello");
      expect(parseConditionExpectedValue("123a")).toBe("123a");
    });

    it("trims whitespace", () => {
      expect(parseConditionExpectedValue(" true ")).toBe(true);
      expect(parseConditionExpectedValue(" 123 ")).toBe(123);
    });
  });
});
