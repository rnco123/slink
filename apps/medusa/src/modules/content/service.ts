import { MedusaService } from "@medusajs/framework/utils"
import ContentPage from "./models/content-page"
import Article from "./models/article"
import SiteSetting from "./models/site-setting"

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
  /** Upsert a site setting by key (settings are singletons keyed by `key`). */
  async upsertSetting(key: string, value: unknown, label?: string) {
    const [existing] = await this.listSiteSettings({ key })
    if (existing) {
      return this.updateSiteSettings({ id: existing.id, value, label })
    }
    return this.createSiteSettings({ key, value, label })
  }
}

export default ContentModuleService
