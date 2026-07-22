/**
 * @saludlink/privacy — the PHI Boundary Firewall.
 *
 * A reusable, framework-light package that keeps Protected Health Information
 * (PHI) out of the Saludlink commerce website. The website stores only identity,
 * auth, orders, cart, addresses, payment references, and marketing preferences —
 * never clinical data, which lives exclusively in the separate telemedicine app
 * and EMR.
 *
 * Public surface:
 *  - {@link validateNoPhi} / {@link assertNoPhi} — recursive PHI detection.
 *  - Strict Zod schemas + helpers ({@link strictObject}, {@link phiSafeText}, …).
 *  - {@link sanitizeObject} / {@link buildSafeMetadata} — allowlist builders.
 *  - {@link captureSafeEvent} — the only sanctioned analytics path.
 *  - {@link createSafeLogger} / {@link redact} — redacting structured logging.
 *  - {@link withPhiFirewall} / {@link phiFirewallMiddleware} — request firewall.
 *  - {@link inspectUrl} / {@link assertUrlSafe} — keep PHI out of URLs.
 *
 * @packageDocumentation
 */

export * from "./data-classification"
export * from "./prohibited-fields"
export * from "./validate-no-phi"
export * from "./sanitize-object"
export * from "./zod-helpers"
export * from "./schemas"
export * from "./analytics"
export * from "./safe-logger"
export * from "./middleware"
