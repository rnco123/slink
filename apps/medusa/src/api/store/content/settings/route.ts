import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"

// GET /store/content/settings — all site settings as a { key: value } map for the storefront.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const settings = await service.listSiteSettings()
  const map: Record<string, unknown> = {}
  for (const s of settings) {
    map[s.key] = s.value
  }
  res.json({ settings: map })
}
