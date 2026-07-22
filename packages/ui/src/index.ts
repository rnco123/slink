/**
 * @saludlink/ui — shared design foundation.
 * Exports tokens + brand constants + a class-merge helper. React components live in the
 * storefront (guaranteed React 19); this package stays framework-light so it can be
 * consumed by Next, OG-image generation, and email templates without version conflicts.
 */
export * from "./tokens/index.js";

/** Minimal className joiner (no dependency). Falsy values dropped, rest space-joined. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
