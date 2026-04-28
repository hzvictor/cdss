import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: [
      "tests/e2e/**",
      "tests/pages/**",
      "lib/ai/models.test.ts",
      "node_modules/**",
    ],
    environment: "node",
  },
});
