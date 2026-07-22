import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"

// GET /admin/content/settings — list all site settings.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const settings = await service.listSiteSettings()
  res.json({ settings })
}

// POST /admin/content/settings — upsert a setting by key { key, value, label? }.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const { key, value, label } = req.body as any
  const setting = await service.upsertSetting(key, value, label)
  res.json({ setting })
}
