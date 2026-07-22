import { defineConfig } from "vitest/config"

/**
 * Vitest configuration for @saludlink/privacy.
 *
 * The package is framework-light (Zod is the only runtime dependency), so tests
 * run in a plain Node environment with no DOM. Globals are enabled so specs can
 * use `describe`/`it`/`expect` without importing them.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/tests/**", "src/index.ts"],
    },
  },
})
