/**
 * Coming-soon preview wall (roadmap task 82).
 *
 * When COMING_SOON is enabled, the storefront middleware rewrites every public
 * route to `/coming-soon` UNLESS the visitor holds a valid `preview_ok` cookie.
 * A visitor earns that cookie by entering the 6-digit preview code, which the
 * server action checks against PREVIEW_CODE.
 *
 * This is a soft LAUNCH gate, not authentication. The admin surface
 * (manage.saludlinkusa.com) is a different host and is never gated here — the
 * wall lives entirely in the storefront middleware.
 */

/** Cookie set once the preview code is accepted. httpOnly so client JS can't forge it. */
export const PREVIEW_COOKIE = "preview_ok"

/**
 * Opaque marker stored in the cookie once the code is accepted. Not a secret —
 * it only distinguishes "passed the wall" from "didn't". The real gate is the
 * PREVIEW_CODE equality check in the server action, which never reaches the
 * client.
 */
export const PREVIEW_TOKEN = "sl-preview-granted"

/** Cookie lifetime — ~30 days. */
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30

/** Launch default preview code; overridden by the PREVIEW_CODE env var. */
const DEFAULT_PREVIEW_CODE = "900800"

/**
 * The wall is active ONLY when explicitly enabled, so local dev and tests are
 * un-gated by default. Set `COMING_SOON=true` in the production storefront env
 * to raise the wall; unset/`false` everywhere else.
 */
export function isComingSoonEnabled(): boolean {
  return process.env.COMING_SOON === "true"
}

/** The configured 6-digit preview code (falls back to the launch default). */
export function getPreviewCode(): string {
  return process.env.PREVIEW_CODE?.trim() || DEFAULT_PREVIEW_CODE
}
