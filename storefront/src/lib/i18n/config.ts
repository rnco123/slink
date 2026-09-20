/**
 * i18n configuration. Saludlink is US-only but bilingual (English + Spanish). The URL's
 * first path segment is the LANGUAGE (/en/…, /es/…) — distinct indexable URLs per language
 * with hreflang, which is the SEO-grade approach. The commerce region is fixed to US
 * internally regardless of language (see lib/data/regions).
 */
export const locales = ["en", "es"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
}

/** BCP-47 tags for <html lang> and hreflang. */
export const localeHreflang: Record<Locale, string> = {
  en: "en-US",
  es: "es-US",
}

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale
}
