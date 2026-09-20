import "server-only"
import type { Locale } from "./config"
import type { Dictionary } from "./dictionaries/en"

/**
 * Dictionary loader. Server-only, dynamically imported so only the active locale's strings
 * ship. Falls back to English if a locale bundle is missing.
 */
const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en"),
  // es.ts mirrors en.ts's shape but its string *values* differ (Spanish), so under
  // `as const` the literal types don't overlap — cast through `unknown` (per TS2352).
  es: () =>
    import("./dictionaries/es") as unknown as Promise<{ default: Dictionary }>,
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const load = loaders[locale] ?? loaders.en
  const mod = await load()
  return mod.default
}

export type { Dictionary }
