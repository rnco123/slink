import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"

// GET /store/content/articles?locale=en — published articles for the learn center.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const locale =
    new URL(req.url, "http://localhost").searchParams.get("locale") ||
    (req.query.locale as string) ||
    "en"
  const articles = await service.listArticles(
    { locale, status: "published" },
    { order: { published_at: "DESC" } }
  )
  res.json({ articles })
}
