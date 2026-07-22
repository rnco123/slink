import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"
import { validateMedusaEnv } from "./src/lib/env"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Fail fast at boot on a misconfigured environment (roadmap task 74). Runs on
// every entrypoint that loads this config: server, worker, build, db:migrate.
validateMedusaEnv()

/**
 * Saludlink — Medusa v2 backend configuration
 * -------------------------------------------------------------------------
 * Healthcare ecommerce (OTC / devices / wellness — NO Rx in v1).
 * Targets: HIPAA-ready, LegitScript-compliant, Stripe-powered, AWS-hosted.
 *
 * Everything reads from env with sensible LOCAL defaults so the app boots on a
 * fresh dev machine (T18) while staying production-parity for AWS (T22/T25).
 *
 * Providers that require real credentials (Stripe, S3, SES) are only enabled
 * when their env vars are present, and fall back to Medusa's built-in
 * local/in-memory providers otherwise. This keeps the very first boot green
 * before Postgres/Redis/AWS are wired up.
 * -------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Environment flags — decide which optional providers to enable.
// ---------------------------------------------------------------------------

// Redis: when present we use the Redis-backed event bus, workflow engine, and
// cache. When absent, Medusa falls back to its in-memory implementations,
// which is fine for a first local boot but NOT for production (no cross-process
// events, no durable workflows).
const REDIS_URL = process.env.REDIS_URL

// Stripe payments — only register the provider when an API key is set.
const STRIPE_API_KEY = process.env.STRIPE_API_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// S3 file storage — enable when the core S3 settings are present, else use the
// built-in local file provider (writes to ./static, served from the backend).
const S3_FILE_URL = process.env.S3_FILE_URL
const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const s3Enabled = Boolean(S3_BUCKET && S3_REGION && S3_FILE_URL)

// AWS SES transactional email — enable when SES/AWS creds are present, else use
// the default (local/no-op) notification provider. Order emails name health
// products, so SES (BAA-eligible) is the production choice.
const SES_FROM = process.env.SES_FROM
const SES_REGION = process.env.SES_REGION || process.env.AWS_REGION
const SES_ACCESS_KEY_ID =
  process.env.SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
const SES_SECRET_ACCESS_KEY =
  process.env.SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
const sesEnabled = Boolean(SES_FROM && SES_REGION)

// ---------------------------------------------------------------------------
// Redis-backed infrastructure modules (only when REDIS_URL is set).
// Built as an array we spread into `modules` below so the fallback is a clean
// "register nothing → Medusa uses in-memory defaults".
// ---------------------------------------------------------------------------
const redisModules = REDIS_URL
  ? [
      {
        // Cross-process pub/sub event bus.
        key: Modules.EVENT_BUS,
        resolve: "@medusajs/event-bus-redis",
        options: {
          redisUrl: REDIS_URL,
        },
      },
      {
        // Durable workflow engine (retries, long-running steps, async flows).
        key: Modules.WORKFLOW_ENGINE,
        resolve: "@medusajs/workflow-engine-redis",
        options: {
          redis: {
            url: REDIS_URL,
          },
        },
      },
      {
        // Shared cache (falls back to in-memory when this is absent).
        key: Modules.CACHE,
        resolve: "@medusajs/cache-redis",
        options: {
          redisUrl: REDIS_URL,
        },
      },
    ]
  : []

// ---------------------------------------------------------------------------
// Payment module — always registered; Stripe provider only added when keyed.
// The Payment module ID is `@medusajs/medusa/payment`; the Stripe provider is
// the separate `@medusajs/payment-stripe` package.
// ---------------------------------------------------------------------------
const paymentModule = {
  key: Modules.PAYMENT,
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: STRIPE_API_KEY
      ? [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: STRIPE_API_KEY,
              // Used to verify inbound Stripe webhook signatures.
              webhookSecret: STRIPE_WEBHOOK_SECRET,
              // verify against Medusa v2 docs — Stripe provider option keys
              // (apiKey / webhookSecret) match the documented v2 shape.
            },
          },
        ]
      : [],
  },
}

// ---------------------------------------------------------------------------
// File module — S3 in production, local file provider otherwise.
// The File module ID is `@medusajs/medusa/file`; S3 provider is
// `@medusajs/file-s3`; the built-in local provider is `@medusajs/file-local`.
// ---------------------------------------------------------------------------
const fileModule = {
  key: Modules.FILE,
  resolve: "@medusajs/medusa/file",
  options: {
    providers: s3Enabled
      ? [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: S3_FILE_URL,
              access_key_id: S3_ACCESS_KEY_ID,
              secret_access_key: S3_SECRET_ACCESS_KEY,
              region: S3_REGION,
              bucket: S3_BUCKET,
              // Optional: custom endpoint for S3-compatible stores.
              endpoint: process.env.S3_ENDPOINT,
              // verify against Medusa v2 docs — @medusajs/file-s3 option keys.
            },
          },
        ]
      : [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: `${
                process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
              }/static`,
            },
          },
        ],
  },
}

// ---------------------------------------------------------------------------
// Notification module — SES for real email, else the local/no-op provider.
// The Notification module ID is `@medusajs/medusa/notification`; SES provider
// is `@medusajs/notification-ses`; the built-in fallback is
// `@medusajs/notification-local` (logs instead of sending).
// ---------------------------------------------------------------------------
const notificationModule = {
  key: Modules.NOTIFICATION,
  resolve: "@medusajs/medusa/notification",
  options: {
    providers: sesEnabled
      ? [
          {
            resolve: "@medusajs/notification-ses",
            id: "ses",
            options: {
              channels: ["email"],
              from: SES_FROM,
              region: SES_REGION,
              access_key_id: SES_ACCESS_KEY_ID,
              secret_access_key: SES_SECRET_ACCESS_KEY,
              // verify against Medusa v2 docs — @medusajs/notification-ses option keys.
            },
          },
        ]
      : [
          {
            resolve: "@medusajs/notification-local",
            id: "local",
            options: {
              channels: ["email"],
              from: SES_FROM || "no-reply@saludlinkusa.com",
            },
          },
        ],
  },
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
module.exports = defineConfig({
  projectConfig: {
    // Postgres connection. Local default matches docs & docker-compose creds.
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgres://saludlink:saludlink_local@localhost:5432/medusa",

    // Redis connection for framework-level features (sessions, rate limiting).
    // Left undefined → Medusa uses in-memory equivalents for a first boot.
    redisUrl: REDIS_URL,

    http: {
      // CORS: storefront on :8000, admin/vite on :9000/:5173 by local default.
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors:
        process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:5173",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:8000,http://localhost:9000,http://localhost:5173",

      // Secrets — MUST be overridden in production via env / Secrets Manager.
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },

  // Admin dashboard config. MEDUSA_ADMIN_ONWARD / disable via env in prod if the
  // admin is served separately (manage.saludlinkusa.com).
  admin: {
    // Set MEDUSA_ADMIN_DISABLE=true on worker/API-only deployments.
    disable: process.env.MEDUSA_ADMIN_DISABLE === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },

  // Array form of module registration. Each infra/provider module carries an
  // explicit `key` (its registration key) plus `resolve` + `options`.
  // verify against Medusa v2 docs — array-vs-object modules shape and whether
  // the explicit `key` is required for the built-in event-bus/cache/workflow
  // overrides in 2.16 (object form keyed by Modules.* is the alternative).
  modules: [
    // Commerce provider modules.
    paymentModule,
    fileModule,
    notificationModule,

    // Redis infra modules (spread; empty array = use in-memory defaults).
    ...redisModules,

    // Custom HIPAA audit-log module (T33) — append-only audit trail.
    {
      resolve: "./src/modules/audit-log",
    },
    // Content module — Saludlink mini-CMS (policies, blog, site settings) powering
    // the custom admin sections and read by the storefront.
    {
      resolve: "./src/modules/content",
    },
  ],
})
