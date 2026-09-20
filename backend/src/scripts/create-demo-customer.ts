import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Creates a demo customer record so the admin Customers view has sample data.
 * Run: npx medusa exec ./src/scripts/create-demo-customer.ts
 * (End users self-register via the storefront /account flow; admins are invited via
 * Settings → Users. This just seeds a visible example.)
 */
export default async function createDemoCustomer({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)

  const email = "demo.patient@example.com"
  const existing = await customerModule.listCustomers({ email })
  if (existing.length) {
    console.log(`Customer ${email} already exists — skipping.`)
    return
  }

  await customerModule.createCustomers([
    {
      email,
      first_name: "Demo",
      last_name: "Patient",
      company_name: "Saludlink Demo",
    },
  ])

  console.log(`✔ Created demo customer: ${email}`)
}
