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
 * Targets: HIPAA-ready, LegitScript-compliant, bank-transfer payments,
 * Railway-hosted.
 *
 * Everything reads from env with sensible LOCAL defaults so the app boots on a
 * fresh dev machine (T18) while staying production-parity for Railway (T22/T25).
 *
 * Providers that require real credentials (Supabase Storage, Resend) are only
 * enabled when their env vars are present, and fall back to Medusa's built-in
 * local/in-memory providers otherwise. This keeps the very first boot green
 * before Postgres/Redis/Supabase are wired up. Payments need no credentials at
 * all — bank transfer uses the built-in system provider.
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

// Object storage — Supabase Storage, which speaks the S3 protocol, so Medusa's
// S3 file provider drives it unchanged. Enabled when the core settings are
// present, else the built-in local file provider (writes to ./static, served
// from the backend). Railway containers have ephemeral disks, so the local
// provider is dev-only — uploads there do not survive a redeploy.
//
// For Supabase Storage:
//   S3_ENDPOINT  https://<project-ref>.supabase.co/storage/v1/s3
//   S3_FILE_URL  https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>
//   S3_REGION    the project's region (e.g. us-east-1)
//   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY  Supabase Storage S3 access keys
// The same vars also point at any other S3-compatible store (R2, MinIO).
const S3_FILE_URL = process.env.S3_FILE_URL
const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const S3_ENDPOINT = process.env.S3_ENDPOINT
const s3Enabled = Boolean(S3_BUCKET && S3_REGION && S3_FILE_URL)

// Resend transactional email — enable when an API key + from-address are set,
// else use the default (local/no-op) notification provider that logs instead of
// sending. Order emails name health products, so a signed Resend BAA is
// required before real sends go out in production (task 39).
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM
const resendEnabled = Boolean(RESEND_API_KEY && RESEND_FROM)

// Production toggle — drives secure cookie flags (task 52). Cookies must NOT be
// `Secure` over plain http in local dev or the admin session breaks on
// localhost; in prod everything is https behind Railway's edge so Secure is required.
const isProduction = process.env.NODE_ENV === "production"

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
// Payment module — BANK TRANSFER only.
//
// There is no card gateway. Checkout uses Medusa's built-in system provider
// (`pp_system_default`), which authorises without contacting any gateway: the
// customer is shown our bank details, makes the transfer themselves, confirms
// they have sent it, and the order is placed.
//
// IMPORTANT — payment is NOT verified at checkout. The system provider leaves
// the payment AUTHORISED, NOT CAPTURED, so every order arrives awaiting
// reconciliation. Staff confirm the funds landed and then capture the payment in
// Admin (Orders → Payments → Capture) before fulfilling. Do not fulfil on the
// customer's say-so alone — nothing in this flow proves money moved.
//
// The Payment module ID is `@medusajs/medusa/payment`. The system provider needs
// no extra package, no credentials — and no `providers` entry: the payment
// module's own loader ALWAYS registers SystemPaymentProvider under `id: "default"`
// (giving `pp_system_default`) before it walks `options.providers`.
//
// Do NOT re-declare it there. `options.providers` is passed to
// `moduleProviderLoader`, which `require()`s each `resolve` path — and there is
// no `@medusajs/medusa/payment-system` module to require, so listing it crashes
// the backend at boot with MODULE_NOT_FOUND. An empty/absent providers list is
// the correct way to run bank-transfer-only.
// ---------------------------------------------------------------------------
const paymentModule = {
  key: Modules.PAYMENT,
  resolve: "@medusajs/medusa/payment",
}

// ---------------------------------------------------------------------------
// File module — Supabase Storage in production, local file provider otherwise.
// The File module ID is `@medusajs/medusa/file`; the S3-protocol provider is
// `@medusajs/file-s3` (which Supabase Storage speaks); the built-in local
// provider is `@medusajs/file-local`.
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
              // Endpoint for the S3-compatible store. Required for Supabase
              // Storage; omit only for genuine AWS S3.
              endpoint: S3_ENDPOINT,
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
// Notification module — Resend for real email, else the local/no-op provider.
// The Notification module ID is `@medusajs/medusa/notification`; the Resend
// provider is our own module at `./src/modules/notification-resend` (Medusa
// ships no first-party Resend provider); the built-in fallback is
// `@medusajs/notification-local` (logs instead of sending).
// ---------------------------------------------------------------------------
const notificationModule = {
  key: Modules.NOTIFICATION,
  resolve: "@medusajs/medusa/notification",
  options: {
    providers: resendEnabled
      ? [
          {
            resolve: "./src/modules/notification-resend",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: RESEND_API_KEY,
              from: RESEND_FROM,
            },
          },
        ]
      : [
          {
            resolve: "@medusajs/notification-local",
            id: "local",
            options: {
              channels: ["email"],
              from: RESEND_FROM || "no-reply@saludlinkusa.com",
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
    // Postgres / Supabase connection. Local default matches docs & docker-compose creds.
    // Supports Supabase Direct (port 5432) and Supabase Pooler (port 6543/5432).
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgres://saludlink:saludlink_local@localhost:5432/medusa",
    databaseDriverOptions:
      process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.includes("supabase.co") ||
        process.env.DATABASE_URL.includes("supabase.com") ||
        process.env.DATABASE_URL.includes("sslmode=require"))
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : undefined,

    // Redis connection for framework-level features (sessions, rate limiting).
    // Left undefined → Medusa uses in-memory equivalents for a first boot.
    redisUrl: REDIS_URL,

    http: {
      // CORS (task 52): env-driven, with localhost defaults ONLY for dev. In
      // production these come from STORE_CORS/ADMIN_CORS/AUTH_CORS and env.ts
      // (validateMedusaEnv) hard-rejects any non-https origin at boot, so a
      // misconfigured prod CORS fails fast instead of silently allowing http.
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors:
        process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:5173",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:8000,http://localhost:9000,http://localhost:5173",

      // Secrets — MUST be overridden in production via Railway variables.
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },

    // Session / auth cookie flags (task 52). Applied to the cookies Medusa sets
    // for the admin session. Storefront customer auth uses a bearer JWT stored
    // in an httpOnly cookie the STOREFRONT sets — those flags live in
    // storefront/src/lib/data/cookies.ts (already httpOnly + sameSite:strict
    // + secure-in-prod).
    //   - httpOnly: JS can never read the cookie (XSS can't exfiltrate it).
    //   - sameSite "lax": sent on top-level navigations (admin login redirects
    //     work) but not on cross-site subrequests (CSRF mitigation).
    //   - secure: https-only in prod; off in dev so localhost http still works.
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      // Absolute admin-session lifetime (task 41 — HIPAA session timeout). The
      // session cookie expires after this window, forcing re-authentication.
      // Default 8h (a work shift); tighten via ADMIN_SESSION_MAX_AGE_S (seconds).
      maxAge:
        (Number.parseInt(process.env.ADMIN_SESSION_MAX_AGE_S || "", 10) ||
          8 * 60 * 60) * 1000,
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
    // Product reviews (T21b) — custom module with mandatory moderation gate.
    {
      resolve: "./src/modules/product-review",
    },
  ],
})
