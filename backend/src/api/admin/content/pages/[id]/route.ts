import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"
import ContentModuleService from "../../../../../modules/content/service"

// GET /admin/content/pages/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const page = await service.retrieveContentPage(req.params.id)
  res.json({ page })
}

// POST /admin/content/pages/:id — update
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const page = await service.updateContentPages({
    id: req.params.id,
    ...(req.body as any),
  })
  res.json({ page })
}

// DELETE /admin/content/pages/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  await service.deleteContentPages(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
