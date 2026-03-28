import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**/*.ts",
        "src/components/journey/journey-map-config.ts",
      ],
      exclude: [
        "src/lib/db/index.ts",
        "src/lib/db/queries.ts",
        "src/lib/db/schema.ts",
        "src/lib/ai/cerebras.ts",
        "src/lib/device-id.ts",
        "src/lib/image-utils.ts",
        "src/lib/map/**",
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
