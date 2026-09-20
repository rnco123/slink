import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"
import ContentModuleService from "../../../../../modules/content/service"

// GET /store/content/pages/:slug?locale=en — published page for the storefront.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  // Medusa's store layer can strip unvalidated query params from req.query, so parse the
  // raw URL as the source of truth for locale.
  const locale =
    new URL(req.url, "http://localhost").searchParams.get("locale") ||
    (req.query.locale as string) ||
    "en"
  const [page] = await service.listContentPages({
    slug: req.params.slug,
    locale,
    status: "published",
  })
  if (!page) {
    res.status(404).json({ message: "Not found" })
    return
  }
  res.json({ page })
}
