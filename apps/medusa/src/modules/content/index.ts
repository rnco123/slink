import { Module } from "@medusajs/framework/utils"
import ContentModuleService from "./service"

/**
 * Content module — the Saludlink mini-CMS (policies/legal pages, blog articles, and site
 * settings). Powers the custom admin sections and is read by the storefront. Registered in
 * medusa-config.ts via `{ resolve: "./src/modules/content" }`.
 *
 * Run `npx medusa db:generate content` then `npx medusa db:migrate` to create tables.
 */
export const CONTENT_MODULE = "content"

export default Module(CONTENT_MODULE, {
  service: ContentModuleService,
})
