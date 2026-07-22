import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

/**
 * Vitest config for storefront unit tests (roadmap task 59).
 *
 * Scope: pure `lib/` logic that does NOT depend on the Next runtime, the DOM, or
 * `server-only` (those are covered by Playwright e2e instead). Tests import
 * `describe/it/expect` explicitly (globals off) so the existing `tsc --noEmit`
 * typecheck compiles them without extra global types.
 */
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@lib": resolve(__dirname, "src/lib"),
      "@modules": resolve(__dirname, "src/modules"),
    },
  },
})
