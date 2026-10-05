import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the @/ alias from tsconfig.json, so tests import app code the way the app does.
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    unstubEnvs: true,
  },
});
