import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"
import ContentModuleService from "../../../../../modules/content/service"

// GET /store/content/articles/:slug?locale=en — single published article.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const locale =
    new URL(req.url, "http://localhost").searchParams.get("locale") ||
    (req.query.locale as string) ||
    "en"
  const [article] = await service.listArticles({
    slug: req.params.slug,
    locale,
    status: "published",
  })
  if (!article) {
    res.status(404).json({ message: "Not found" })
    return
  }
  res.json({ article })
}
