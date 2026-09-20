import { MedusaService } from "@medusajs/framework/utils"
import ContentPage from "./models/content-page"
import Article from "./models/article"
import SiteSetting from "./models/site-setting"

/** Any JSON-serialisable value — what a `content_site_setting.value` may hold. */
type SettingValue =
  | string
  | number
  | boolean
  | null
  | SettingValue[]
  | { [key: string]: SettingValue }

/**
 * ContentModuleService — the Saludlink mini-CMS backing the custom admin sections.
 * MedusaService auto-generates CRUD for each model, e.g.
 *   createContentPages / listContentPages / updateContentPages / deleteContentPages
 *   createArticles / listArticles / updateArticles / ...
 *   createSiteSettings / listSiteSettings / updateSiteSettings / ...
 * Admin API routes call these to manage content; store API routes read published rows.
 */
class ContentModuleService extends MedusaService({
  ContentPage,
  Article,
  SiteSetting,
}) {
  /**
   * Upsert a site setting by key (settings are singletons keyed by `key`).
   *
   * The column is a JSON field, so any JSON value is valid at runtime (object,
   * array, string, …). Medusa's generated CRUD narrows the `value` type to
   * `Record<string, unknown>`, so we accept a broad `SettingValue` for callers
   * and cast once at the persistence boundary.
   */
  async upsertSetting(key: string, value: SettingValue, label?: string) {
    const persistedValue = value as Record<string, unknown>
    const [existing] = await this.listSiteSettings({ key })
    if (existing) {
      return this.updateSiteSettings({
        id: existing.id,
        value: persistedValue,
        label,
      })
    }
    return this.createSiteSettings({ key, value: persistedValue, label })
  }
}

export default ContentModuleService
