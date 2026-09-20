const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * Supabase Storage host, parsed out of the project URL so the image optimizer
 * will serve uploads. Wrapped because the value is optional and a malformed
 * URL must not take the build down.
 */
const SUPABASE_HOSTNAME = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
})()

/**
 * Security headers (T16). LegitScript Standard 6 requires SSL/encryption everywhere;
 * these harden the transport + browser surface. CSP permits our own assets only —
 * checkout is bank transfer, so there is no payment gateway to allowlist.
 * Kept as a strong allowlist; tighten to nonce-based per-route if we add more 3rd parties.
 */
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects an inline runtime. 'unsafe-inline' scoped to scripts we control.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' " + (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""),
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
]

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone", // for ECS/Docker deploys (Phase 5)
  transpilePackages: ["@saludlink/ui", "@saludlink/privacy"], // workspace packages ship raw TS
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  // PostHog reverse proxy — keeps analytics same-origin so the strict CSP needs no
  // PostHog host in connect-src and ad/tracker blockers can't drop our events.
  // Requires skipTrailingSlashRedirect so PostHog's trailing-slash API paths pass through.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const host = process.env.POSTHOG_INGEST_HOST || "https://us.i.posthog.com"
    const assetsHost =
      process.env.POSTHOG_ASSETS_HOST || "https://us-assets.i.posthog.com"
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${assetsHost}/static/:path*`,
      },
      { source: "/ingest/:path*", destination: `${host}/:path*` },
      { source: "/ingest/decide", destination: `${host}/decide` },
    ]
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Demo product art is SVG; allow it (sandboxed + CSP below). Swap for raster on real assets.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      // Product artwork lives in our own public/products/*.svg but is stored on
      // the product as an ABSOLUTE url (so Admin and emails resolve it too).
      // The optimizer therefore treats it as a REMOTE image and refuses any host
      // that isn't allowlisted — without these entries it returns 400 and every
      // product tile renders as a broken image.
      { protocol: "https", hostname: "saludlinkusa.com" },
      { protocol: "https", hostname: "www.saludlinkusa.com" },
      // Product/content uploads served from Supabase Storage. Derived from the
      // project URL so there is one variable to set, not two.
      ...(SUPABASE_HOSTNAME
        ? [
            {
              protocol: "https",
              hostname: SUPABASE_HOSTNAME,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [{ protocol: "https", hostname: S3_HOSTNAME, pathname: S3_PATHNAME }]
        : []),
    ],
  },
}

module.exports = nextConfig
