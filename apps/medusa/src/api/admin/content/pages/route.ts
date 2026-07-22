import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"

// GET /admin/content/pages — list all content pages (both locales, all statuses).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const pages = await service.listContentPages(
    {},
    { order: { slug: "ASC", locale: "ASC" } }
  )
  res.json({ pages })
}

// POST /admin/content/pages — create a content page.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const created = await service.createContentPages(req.body as any)
  res.status(201).json({ page: created })
}
