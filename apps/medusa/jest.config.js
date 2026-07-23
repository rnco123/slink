const { loadEnv } = require("@medusajs/utils")
loadEnv("test", process.cwd())

// Integration-test DB bootstrap (tasks 23/24). @medusajs/test-utils builds the
// throwaway DB connection from these DB_* vars (NOT DATABASE_URL). Defaults kept
// here — not only in the gitignored .env.test — so a fresh clone and CI both run
// without extra setup. Real env (CI Postgres service) overrides these.
//
// DB_HOST MUST resolve to a value containing "localhost": test-utils forces
// `ssl: { rejectUnauthorized: false }` for any other host, and a plain local
// Postgres has no SSL, so the app hangs at boot ("pool is probably full"). CI's
// Postgres service must therefore be reached as `localhost`, not 127.0.0.1.
process.env.DB_HOST = process.env.DB_HOST || "localhost"
process.env.DB_PORT = process.env.DB_PORT || "5432"
process.env.DB_USERNAME = process.env.DB_USERNAME || "saludlink"
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "saludlink_local"

// Hermetic: run integration tests on the in-memory event bus / workflow engine
// rather than the dev .env's Redis (which may be down on a fresh clone/CI). The
// content + reviews suites don't exercise cross-process events.
process.env.REDIS_URL = ""

module.exports = {
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.js"],
}

if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"]
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.[jt]s"]
} else if (process.env.TEST_TYPE === "unit") {
  module.exports.testMatch = ["**/src/**/__tests__/**/*.unit.spec.[jt]s"]
}
