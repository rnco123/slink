import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"

// GET /store/content/pages?locale=en[&type=legal] — published pages for the
// storefront (used by the sitemap to emit /legal/[slug] URLs, task 22).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  // Medusa's store layer can strip unvalidated query params from req.query, so
  // parse the raw URL as the source of truth.
  const url = new URL(req.url, "http://localhost")
  const locale =
    url.searchParams.get("locale") || (req.query.locale as string) || "en"
  const type = url.searchParams.get("type") || (req.query.type as string)

  const filters: Record<string, unknown> = { locale, status: "published" }
  if (type) {
    filters.type = type
  }

  const pages = await service.listContentPages(filters, {
    select: ["id", "slug", "locale", "type", "title", "last_updated"],
    order: { slug: "ASC" },
  })
  res.json({ pages })
}
