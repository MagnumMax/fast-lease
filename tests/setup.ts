import { afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  process.env.TZ = process.env.TZ ?? "UTC";
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.restoreAllMocks();
});
