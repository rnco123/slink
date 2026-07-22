import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"
import ContentModuleService from "../../../../../modules/content/service"

// GET /admin/content/articles/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const article = await service.retrieveArticle(req.params.id)
  res.json({ article })
}

// POST /admin/content/articles/:id — update
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const article = await service.updateArticles({
    id: req.params.id,
    ...(req.body as any),
  })
  res.json({ article })
}

// DELETE /admin/content/articles/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  await service.deleteArticles(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
