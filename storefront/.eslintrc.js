/**
 * Storefront ESLint config.
 *
 * Beyond Next's defaults, we enforce two PHI-boundary rules (see
 * docs/privacy-boundary.md):
 *
 *  1. `posthog-js` may only be imported inside the sanctioned analytics wrapper
 *     (src/lib/analytics/**). Everywhere else, use `captureSafeEvent` from
 *     `@saludlink/privacy`, which validates payloads and strips PHI.
 *  2. Raw `console.*` is discouraged; route structured logging through the safe
 *     logger (`createSafeLogger` from `@saludlink/privacy`) which redacts
 *     sensitive values. `console.warn`/`console.error` remain available for
 *     genuine diagnostics.
 */
module.exports = {
  extends: ["next/core-web-vitals"],
  // Tell the Next ESLint plugin where this app lives, so rules that inspect the
  // app/pages directory (e.g. no-html-link-for-pages) resolve correctly in the
  // monorepo instead of crashing with "path argument must be of type string".
  settings: { next: { rootDir: __dirname } },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "posthog-js",
            message:
              "Do not import posthog-js directly. Use captureSafeEvent() from @saludlink/privacy. Raw posthog-js is only permitted in src/lib/analytics/**.",
          },
          {
            name: "posthog-js/react",
            message:
              "Import the PostHog provider from src/lib/analytics only. Emit events via captureSafeEvent() from @saludlink/privacy.",
          },
        ],
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  overrides: [
    {
      // The one place allowed to touch posthog-js directly: the safe wrapper.
      files: ["src/lib/analytics/**"],
      rules: { "no-restricted-imports": "off" },
    },
    {
      // Logger + analytics wrappers may use console as their transport.
      files: ["src/lib/analytics/**", "src/lib/logger/**"],
      rules: { "no-console": "off" },
    },
    {
      // Tests and scripts are not shipped to the browser.
      files: ["e2e/**", "**/*.test.ts", "**/*.test.tsx", "scripts/**"],
      rules: { "no-restricted-imports": "off", "no-console": "off" },
    },
  ],
}
