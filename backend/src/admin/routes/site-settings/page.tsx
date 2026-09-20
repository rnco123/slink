import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CogSixTooth } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

type Contact = Record<string, string>
type Bank = Record<string, string>

/** Fields shown for the bank-transfer details. The first three are REQUIRED —
 *  checkout refuses to take an order until all three are filled, because the
 *  customer would otherwise be asked to transfer money to a blank account. */
const BANK_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "bankName", label: "Bank name", required: true },
  { key: "accountName", label: "Account name", required: true },
  { key: "accountNumber", label: "Account number", required: true },
  { key: "routingNumber", label: "Routing number" },
]

const SiteSettingsAdminPage = () => {
  const [contact, setContact] = useState<Contact>({})
  const [telemedUrl, setTelemedUrl] = useState("")
  const [statesJson, setStatesJson] = useState("[]")
  const [bank, setBank] = useState<Bank>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/content/settings", {
        credentials: "include",
      })
      const data = await res.json()
      const map: Record<string, any> = {}
      for (const s of data.settings || []) map[s.key] = s.value
      setContact(map.contact || {})
      setTelemedUrl(map.telemedicine_url || "")
      setStatesJson(JSON.stringify(map.state_availability || [], null, 2))
      setBank(map.bank_transfer || {})
    } catch {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const put = async (key: string, value: unknown) => {
    const res = await fetch("/admin/content/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) throw new Error()
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      let states
      try {
        states = JSON.parse(statesJson)
      } catch {
        toast.error("State availability is not valid JSON")
        setSaving(false)
        return
      }
      await put("contact", contact)
      await put("telemedicine_url", telemedUrl)
      await put("state_availability", states)
      await put("bank_transfer", bank)
      toast.success("Settings saved")
    } catch {
      toast.error("Save failed")
    } finally {
      setSaving(false)
    }
  }

  const bankReady = Boolean(
    bank.bankName && bank.accountName && bank.accountNumber
  )

  const contactFields = [
    "legalEntity",
    "addressLine",
    "city",
    "state",
    "zip",
    "phone",
    "email",
    "hours",
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Site Settings</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Contact info, telemedicine link, and state availability (LegitScript
            disclosure). Read by the storefront.
          </Text>
        </div>
        <Button onClick={saveAll} isLoading={saving}>
          Save all
        </Button>
      </div>

      {loading ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Loading…</Text>
        </div>
      ) : (
        <>
          <div className="px-6 py-5">
            <Heading level="h3" className="mb-3">
              Contact
            </Heading>
            <div className="grid grid-cols-2 gap-4">
              {contactFields.map((f) => (
                <div key={f} className="flex flex-col gap-1">
                  <Label>{f}</Label>
                  <Input
                    value={contact[f] || ""}
                    onChange={(e) =>
                      setContact({ ...contact, [f]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-5">
            <Heading level="h3" className="mb-3">
              Telemedicine link-out URL
            </Heading>
            <Input
              value={telemedUrl}
              onChange={(e) => setTelemedUrl(e.target.value)}
            />
          </div>

          <div className="px-6 py-5">
            <Heading level="h3" className="mb-1">
              Bank transfer details
            </Heading>
            <Text className="text-ui-fg-subtle mb-3" size="small">
              The account customers transfer to at checkout. Saved here and read
              live by the storefront — no redeploy needed. Bank name, account
              name and account number are all required; until each is filled,
              checkout shows &ldquo;payment details unavailable&rdquo; and
              refuses to take an order.
            </Text>
            {!bankReady && (
              <Text className="text-ui-fg-error mb-3" size="small">
                Incomplete — checkout cannot currently take orders.
              </Text>
            )}
            <div className="grid grid-cols-2 gap-4">
              {BANK_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1">
                  <Label>
                    {f.label}
                    {f.required ? " *" : ""}
                  </Label>
                  <Input
                    value={bank[f.key] || ""}
                    onChange={(e) =>
                      setBank({ ...bank, [f.key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <Label>Instructions shown to the customer</Label>
              <Textarea
                rows={3}
                value={bank.instructions || ""}
                onChange={(e) =>
                  setBank({ ...bank, instructions: e.target.value })
                }
              />
            </div>
          </div>

          <div className="px-6 py-5">
            <Heading level="h3" className="mb-1">
              State availability
            </Heading>
            <Text className="text-ui-fg-subtle mb-3" size="small">
              JSON array of {"{ code, name, telehealth, shipping }"}.
            </Text>
            <Textarea
              rows={12}
              className="font-mono"
              value={statesJson}
              onChange={(e) => setStatesJson(e.target.value)}
            />
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Site Settings",
  icon: CogSixTooth,
})

export default SiteSettingsAdminPage
