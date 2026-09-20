import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"

// GET /admin/content/articles — list all articles.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const articles = await service.listArticles(
    {},
    { order: { slug: "ASC", locale: "ASC" } }
  )
  res.json({ articles })
}

// POST /admin/content/articles — create an article.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const created = await service.createArticles(req.body as any)
  res.status(201).json({ article: created })
}
