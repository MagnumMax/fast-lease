import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    alias: {
      "@": path.resolve(projectRoot, "."),
    },
  },
});
