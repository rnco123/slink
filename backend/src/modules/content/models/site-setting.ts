import { model } from "@medusajs/framework/utils"

/**
 * SiteSetting — editable site configuration (contact info, telemedicine link, and the
 * state-availability table for the LegitScript disclosure). Stored as key → JSON value so
 * structured settings (like the state list) live in one place. Read by the storefront.
 */
const SiteSetting = model
  .define("content_site_setting", {
    id: model.id().primaryKey(),
    key: model.text(), // e.g. "contact", "telemedicine_url", "state_availability"
    value: model.json(), // structured value
    label: model.text().nullable(),
  })
  .indexes([{ on: ["key"], unique: true }])

export default SiteSetting
