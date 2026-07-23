import { z } from "zod"

/**
 * Boot-time environment validation for the Medusa backend (roadmap task 74).
 * -------------------------------------------------------------------------
 * Called from `medusa-config.ts` right after `loadEnv()`, so it runs on EVERY
 * entrypoint that loads the config: `medusa start`, the worker, `medusa build`,
 * and `medusa db:migrate`. A misconfigured deploy fails fast here with the
 * offending variable named, instead of surfacing as a confusing runtime error
 * (or worse, booting production with the dev default secrets).
 *
 * Philosophy: LENIENT in development/test (the local defaults in the config keep
 * a fresh machine booting), STRICT in production (secrets must be real, URLs
 * must be https, no localhost). Optional providers (Stripe/S3/SES) are validated
 * as all-or-nothing so a half-configured provider is caught before it silently
 * falls back to the local/no-op implementation.
 *
 * This is the server-side twin of the storefront's `src/lib/env.ts`; keep the
 * two in sync with `docs/ENVIRONMENT.md` (task 60).
 */

const DEV_PLACEHOLDER_SECRET = "supersecret"

const isHttpsUrl = (v: string) => /^https:\/\//i.test(v)

const RawEnv = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Postgres. The config supplies a localhost default, so this is optional here;
  // the production refinement below rejects a missing/localhost URL.
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional().or(z.literal("")),

  // Auth secrets — the crux of the fail-fast check for production.
  JWT_SECRET: z.string().optional(),
  COOKIE_SECRET: z.string().optional(),

  // CORS origins (comma-separated). Validated as https in production.
  STORE_CORS: z.string().optional(),
  ADMIN_CORS: z.string().optional(),
  AUTH_CORS: z.string().optional(),

  MEDUSA_BACKEND_URL: z.string().url().optional(),

  // Stripe — provider only registers when STRIPE_API_KEY is set.
  STRIPE_API_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // S3 file storage — enabled only when the core trio is present.
  S3_FILE_URL: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // SES email — enabled only when SES_FROM + a region are present.
  SES_FROM: z.string().optional(),
  SES_REGION: z.string().optional(),
  AWS_REGION: z.string().optional(),
})

export type MedusaEnv = z.infer<typeof RawEnv>

/**
 * `medusa build` (and `db:migrate`/`db:generate`) load this same config but run
 * with dummy connection strings / CI secrets and may set NODE_ENV=production
 * internally. Those are COMPILE/tooling phases, not a server boot, so the
 * production-strictness (no-localhost DB, https CORS, real secrets) must not
 * apply — otherwise CI's placeholder env would fail the build. The format-level
 * checks (Stripe/S3/SES) still run in every phase.
 */
function isBuildOrToolingPhase(
  argv: readonly string[] = process.argv
): boolean {
  const joined = argv.join(" ")
  return /(\bbuild\b|db:migrate|db:generate|db:rollback|db:sync-links)/.test(
    joined
  )
}

function refine(env: MedusaEnv, ctx: z.RefinementCtx) {
  // PREDEPLOY_SMOKE=1 is the local prod-mode smoke ritual (roadmap 78–81): it
  // boots the app with NODE_ENV=production to catch prod-build issues, but points
  // at the LOCAL Postgres + dev secrets. That's intentional and local-only, so
  // the production-strictness (no-localhost DB, https CORS, real secrets) must be
  // skipped. A real deploy never sets this flag, so the guard still holds in prod.
  const isPredeploySmoke = process.env.PREDEPLOY_SMOKE === "1"
  const isProd =
    env.NODE_ENV === "production" &&
    !isBuildOrToolingPhase() &&
    !isPredeploySmoke

  if (isProd) {
    // --- Secrets must be real in production ---------------------------------
    for (const key of ["JWT_SECRET", "COOKIE_SECRET"] as const) {
      const val = env[key]
      if (!val || val === DEV_PLACEHOLDER_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be set to a strong, unique value in production (the "${DEV_PLACEHOLDER_SECRET}" dev default is not allowed).`,
        })
      } else if (val.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is too short (<16 chars) for production.`,
        })
      }
    }

    // --- Database must be a real, non-local endpoint ------------------------
    if (!env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message:
          "DATABASE_URL is required in production (no localhost fallback).",
      })
    } else if (/localhost|127\.0\.0\.1/.test(env.DATABASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must not point at localhost in production.",
      })
    }

    // --- CORS origins should be https in production -------------------------
    for (const key of ["STORE_CORS", "ADMIN_CORS", "AUTH_CORS"] as const) {
      const val = env[key]
      if (!val) continue
      const bad = val
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !isHttpsUrl(s))
      if (bad.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must list https origins in production (got: ${bad.join(
            ", "
          )}).`,
        })
      }
    }

    // --- SES: from + region together (prod only) ---------------------------
    // In dev, SES_FROM without a region is fine — the template ships SES_FROM
    // and email intentionally falls back to the local (logs) provider. In prod,
    // that silent fallback means order emails never send → fail fast.
    const sesRegion = env.SES_REGION || env.AWS_REGION
    if (env.SES_FROM && !sesRegion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SES_REGION"],
        message:
          "SES_FROM is set but no SES_REGION/AWS_REGION — SES email would silently fall back to the local provider (order emails won't send).",
      })
    }
  }

  // --- Stripe: key format + webhook secret pairing (all environments) ------
  if (env.STRIPE_API_KEY) {
    if (!/^(sk|rk)_(test|live)_/.test(env.STRIPE_API_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STRIPE_API_KEY"],
        message:
          "STRIPE_API_KEY must be a Stripe secret key (starts with sk_test_ / sk_live_ / rk_...).",
      })
    }
    if (!env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STRIPE_WEBHOOK_SECRET"],
        message:
          "STRIPE_WEBHOOK_SECRET is required when STRIPE_API_KEY is set (webhook signature verification).",
      })
    }
  }

  // --- S3: all-or-nothing --------------------------------------------------
  const s3Keys = [
    "S3_FILE_URL",
    "S3_BUCKET",
    "S3_REGION",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ] as const
  const s3Set = s3Keys.filter((k) => env[k])
  if (s3Set.length > 0 && s3Set.length < s3Keys.length) {
    const missing = s3Keys.filter((k) => !env[k])
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [missing[0]!],
      message: `S3 is partially configured — missing: ${missing.join(
        ", "
      )}. Set all S3_* vars or none.`,
    })
  }
}

const MedusaEnvSchema = RawEnv.superRefine(refine)

/**
 * Validate `process.env` for the backend. Throws a single formatted error that
 * names every offending variable. Returns the parsed env on success.
 */
export function validateMedusaEnv(
  source: NodeJS.ProcessEnv = process.env
): MedusaEnv {
  const result = MedusaEnvSchema.safeParse(source)
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`
    )
    throw new Error(
      [
        "",
        "🚫 Invalid Medusa environment configuration — refusing to boot:",
        ...lines,
        "",
        "Fix these in your .env (see apps/medusa/.env.template and docs/ENVIRONMENT.md).",
        "",
      ].join("\n")
    )
  }
  return result.data
}
