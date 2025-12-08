import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: [
      "tests/**/*.test.{ts,tsx}",
      "lib/**/__tests__/**/*.test.ts",
      "app/**/__tests__/**/*.test.ts",
    ],
    environmentMatchGlobs: [
      ["tests/ui/**", "jsdom"],
    ],
    exclude: [
      "e2e/**",
      "playwright.config.ts",
      "**/node_modules/**",
    ],
    alias: {
      "@": path.resolve(projectRoot, "."),
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage/unit",
      skipFull: true,
      include: [
        "lib/workflow/**",
        "app/api/workflow/**",
        "app/api/webhooks/esign/**",
        "app/api/deals/[id]/transition/**",
      ],
      exclude: [
        "**/__tests__/**",
        "scripts/**",
        "supabase/**",
        "components/**",
        "app/**/mocks/**",
        "node_modules/**",
      ],
      thresholds: {
        lines: 40,
        statements: 40,
        functions: 35,
        branches: 25,
        perFile: false,
      },
    },
  },
});
