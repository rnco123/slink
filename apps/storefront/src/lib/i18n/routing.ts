import type { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import { locales, localeHreflang, defaultLocale, type Locale } from "./config"

/**
 * SEO helpers for bilingual routing. `path` is the locale-less path (e.g. "/telemedicine"
 * or "/"). Produces canonical + hreflang alternates so Google indexes and links both
 * language variants. This is the SEO-grade i18n pattern.
 */
function abs(path: string): string {
  const origin = getBaseURL().replace(/\/$/, "")
  return `${origin}${path === "/" ? "" : path}`
}

/** Build the localized absolute/relative URL for a locale + locale-less path. */
export function localizedPath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path
  return `/${locale}${clean}`
}

/** Canonical + hreflang languages map for a given locale-less path. */
export function alternatesFor(
  path: string,
  currentLocale: Locale
): Metadata["alternates"] {
  const languages: Record<string, string> = {}
  for (const l of locales) {
    languages[localeHreflang[l]] = abs(localizedPath(l, path))
  }
  languages["x-default"] = abs(localizedPath(defaultLocale, path))
  return {
    canonical: abs(localizedPath(currentLocale, path)),
    languages,
  }
}
