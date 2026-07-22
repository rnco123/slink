import { z } from "zod"

/**
 * Boot-time environment validation for the storefront (roadmap task 74).
 * -------------------------------------------------------------------------
 * Invoked from `src/instrumentation.ts` (Next.js runs `register()` once when the
 * server process boots), so a misconfigured deploy fails fast with the offending
 * variable NAMED, rather than 500-ing on the first request or — worse — quietly
 * booting production with a placeholder revalidation secret.
 *
 * Lenient in development (local defaults keep a fresh checkout running), strict
 * in production (real base URL, no placeholder secrets, https). This is the
 * client-app twin of `apps/medusa/src/lib/env.ts`; keep both aligned with
 * docs/ENVIRONMENT.md (task 60).
 *
 * NOTE: `NEXT_PUBLIC_*` vars are inlined at BUILD time, so the lightweight
 * `check-env-variables.js` (run from next.config.js) guards the build; this zod
 * pass is the RUNTIME boot gate for server-side vars + a defense-in-depth
 * re-check of the public ones.
 */

const DEV_PLACEHOLDER_SECRET = "supersecret"

const RawEnv = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // --- Medusa backend ------------------------------------------------------
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: z
    .string()
    .min(1, "is required (Medusa publishable API key, starts with pk_)")
    .refine(
      (v) => v.startsWith("pk_"),
      "must be a Medusa publishable key (starts with pk_)"
    ),
  MEDUSA_BACKEND_URL: z.string().url().optional(),

  // --- Public site ---------------------------------------------------------
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_DEFAULT_REGION: z
    .string()
    .regex(/^[a-z]{2}$/, "must be a lowercase ISO-2 country code (e.g. us)")
    .optional(),

  // --- Coming-soon wall (task 82) ------------------------------------------
  COMING_SOON: z.enum(["true", "false"]).optional(),
  PREVIEW_CODE: z
    .string()
    .regex(/^\d{6}$/, "must be a 6-digit code")
    .optional(),

  // --- Revalidation --------------------------------------------------------
  REVALIDATE_SECRET: z.string().optional(),

  // --- Stripe (public) -----------------------------------------------------
  NEXT_PUBLIC_STRIPE_KEY: z
    .string()
    .refine(
      (v) => v === "" || v.startsWith("pk_"),
      "must be a Stripe publishable key (starts with pk_)"
    )
    .optional(),

  // --- PostHog analytics ---------------------------------------------------
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  POSTHOG_INGEST_HOST: z.string().url().optional(),
  POSTHOG_ASSETS_HOST: z.string().url().optional(),
})

export type StorefrontEnv = z.infer<typeof RawEnv>

function refine(env: StorefrontEnv, ctx: z.RefinementCtx) {
  const isProd = env.NODE_ENV === "production"

  // The wall is ON in every environment by project decision — if it's enabled,
  // a real 6-digit code is mandatory (default "900800" lives in the template but
  // a blank PREVIEW_CODE would lock everyone out).
  if (env.COMING_SOON === "true" && !env.PREVIEW_CODE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PREVIEW_CODE"],
      message:
        "PREVIEW_CODE (6 digits) is required when COMING_SOON=true, otherwise no one can unlock the wall.",
    })
  }

  if (isProd) {
    if (!env.NEXT_PUBLIC_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_BASE_URL"],
        message:
          "NEXT_PUBLIC_BASE_URL is required in production (used for canonicals, sitemap, robots).",
      })
    } else if (!/^https:\/\//i.test(env.NEXT_PUBLIC_BASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_BASE_URL"],
        message: "NEXT_PUBLIC_BASE_URL must be https in production.",
      })
    }

    if (
      !env.REVALIDATE_SECRET ||
      env.REVALIDATE_SECRET === DEV_PLACEHOLDER_SECRET
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REVALIDATE_SECRET"],
        message: `REVALIDATE_SECRET must be a strong, unique value in production (the "${DEV_PLACEHOLDER_SECRET}" default is not allowed).`,
      })
    }
  }
}

const StorefrontEnvSchema = RawEnv.superRefine(refine)

/**
 * Validate `process.env`. Throws a single formatted error naming every offending
 * variable. Returns the parsed env on success.
 */
export function validateStorefrontEnv(
  source: NodeJS.ProcessEnv = process.env
): StorefrontEnv {
  const result = StorefrontEnvSchema.safeParse(source)
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`
    )
    throw new Error(
      [
        "",
        "🚫 Invalid storefront environment configuration — refusing to boot:",
        ...lines,
        "",
        "Fix these in your .env.local (see apps/storefront/.env.template and docs/ENVIRONMENT.md).",
        "",
      ].join("\n")
    )
  }
  return result.data
}
