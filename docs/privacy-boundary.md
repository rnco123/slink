# PHI Boundary — the Saludlink Privacy Firewall

Saludlink's website is a **commerce** application. It is **not** an EMR and **not**
the telemedicine app. It must never store or process **Protected Health
Information (PHI)**. This document explains the boundary and the reusable
`@saludlink/privacy` package that enforces it.

> **Golden rule:** the website stores identity, auth, orders, cart, addresses,
> payment references, and marketing preferences — nothing clinical. Clinical data
> lives exclusively in the telemedicine app and the EMR.

---

## Architecture

Every mutating request flows through the firewall before it can touch a
datastore, a third party, or a log:

```
                 Browser
                    │
                    ▼
          Zod strict validation      ← unknown props → HTTP 400
                    │
                    ▼
             PHI Firewall             ← prohibited keys / clinical text → HTTP 400
                    │
                    ▼
            Business logic
                    │
        ┌───────────┼─────────────┬───────────────┐
        ▼           ▼             ▼               ▼
    PostgreSQL   Medusa        Cognito         Stripe
    (metadata    (safe         (identity       (payment refs
     allowlist)   metadata)     attrs only)     only)
        │
        ▼
    Analytics (captureSafeEvent)   ← approved events, no free text
        │
        ▼
    Logging (createSafeLogger)     ← redacts secrets, contact data, PHI
```

Nothing bypasses the firewall. The package is framework-light (Zod is its only
runtime dependency) so it runs in Next.js 15 route handlers, the edge runtime,
Medusa v2, and Node scripts.

---

## Allowed data (commerce)

| Category      | Examples                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| Identity      | customer id, first/last name, email, phone, company                       |
| Addresses     | shipping + billing (street, city, province, postal code, country)         |
| Commerce      | cart, order, line items, product/variant ids, SKU, quantity               |
| Payments      | payment **status**, provider **reference** (e.g. Stripe PaymentIntent id) |
| Merchandising | coupon / discount code, gift order flag + message                         |
| Preferences   | locale, currency, marketing opt-in / source                               |

Anything not on an allowlist must be **explicitly approved** before it is stored.

## Forbidden data (PHI — never allowed)

diagnosis · symptoms · medications · prescriptions · SOAP/provider/visit notes ·
treatment plan · lab results · appointment reason / chief complaint · medical
history · allergies (patient) · patient id · EMR id · encounter id · provider id ·
insurance information · immunizations · vitals · clinical documents · ICD/CPT/NDC
codes.

The firewall inspects **nested** objects and arrays, so PHI cannot hide inside a
`metadata` blob or a list.

---

## Developer rules

1. **Validate every public input with a strict schema.** Use the schemas in
   `@saludlink/privacy/schemas` (or build your own with `strictObject`). Unknown
   properties return **HTTP 400**.
2. **Never assign browser data to `metadata`.** Build it server-side with
   `buildSafeMetadata()`.
3. **Never import `posthog-js`.** Emit analytics with `captureSafeEvent()`
   (ESLint blocks direct imports outside `src/lib/analytics/**`).
4. **Never `console.log` user data.** Use `createSafeLogger()`; it redacts
   tokens, cookies, emails, phones, addresses, request bodies, and PHI.
5. **Never put PHI in a URL.** No `?patientId=`, `?diagnosis=`, etc. Use opaque
   one-time SSO tokens for cross-system links. Guard with `assertUrlSafe()`.
6. **Cognito attributes are identity-only.** Build them with
   `buildSafeCognitoAttributes()`. No `custom:patient_id`, `custom:diagnosis`, …
7. **Do not block legitimate commerce search.** "Blood Pressure Monitor",
   "Glucose Monitor", and "Vitamin D" are products — never PHI. Search inputs are
   intentionally not scanned as clinical text.

---

## Examples

### Route handler (Next.js 15 App Router)

```ts
import { withPhiFirewall } from "@saludlink/privacy/middleware"
import { ContactFormSchema } from "@saludlink/privacy/schemas"

// scanAllText: free-text message is scanned for clinical narratives.
export const POST = withPhiFirewall(
  async (req) => {
    const data = ContactFormSchema.parse(await req.json()) // throws → 400 on PHI
    await createSupportTicket(data)
    return Response.json({ ok: true })
  },
  { scanAllText: true }
)
```

### Safe Medusa metadata

```ts
import { buildSafeMetadata } from "@saludlink/privacy"

// ❌ BAD — trusts the browser
// cart.metadata = request.body.metadata

// ✅ GOOD — server-constructed allowlist
cart.metadata = buildSafeMetadata(request.body.metadata) // { locale, marketing_source, gift_order, ... }
```

### Safe analytics

```ts
import { captureSafeEvent } from "@saludlink/privacy"

captureSafeEvent("order_completed", {
  order_id: order.id,
  value: 34,
  currency_code: "usd",
  item_count: 1,
})
// Unknown event, extra fields, or any PHI → dropped (never throws, never sends).
```

### Safe logging

```ts
import { createSafeLogger } from "@saludlink/privacy"

const log = createSafeLogger({ base: { service: "storefront" } })
log.info("checkout.completed", { orderId: "order_1", email: "a@b.com" })
// → { level:"info", message:"checkout.completed",
//     context:{ service:"storefront", orderId:"order_1", email:"[REDACTED]" } }
```

### Contact form that receives medical text

The schema rejects it with **HTTP 400** and the friendly message; the request is
not saved, logged, emailed, or sent to analytics:

> "Please do not enter medical or treatment information on this website. Use the
> secure telemedicine portal for clinical questions."

---

## Testing guide

- **Unit (Vitest)** — `pnpm --filter @saludlink/privacy test`. Covers nested PHI
  detection, allowed payloads, strict-schema rejection, analytics validation,
  logger redaction, metadata filtering, middleware, and URL validation.
- **Type safety** — `pnpm --filter @saludlink/privacy typecheck`.
- **E2E (Playwright)** — `apps/storefront/e2e/privacy.spec.ts` asserts no PHI in
  analytics egress, no PHI in URLs/links, and that session replay is off.
- **Lint** — `next lint` fails a build that imports `posthog-js` outside the
  analytics wrapper.

---

## Common mistakes

| Mistake                                           | Fix                                           |
| ------------------------------------------------- | --------------------------------------------- |
| `metadata = req.body.metadata`                    | `buildSafeMetadata(req.body.metadata)`        |
| `z.object({...})` for a public API                | `strictObject({...})` (rejects unknown props) |
| `import posthog from "posthog-js"` in a component | `captureSafeEvent(...)`                       |
| `console.log(req.body)`                           | `createSafeLogger().info("event", ctx)`       |
| Sending the raw search query to analytics         | send `query_length` + `results_count`         |
| `redirect('/sso?patientId=' + id)`                | opaque one-time token; `assertUrlSafe(url)`   |
| Adding `custom:diagnosis` to Cognito              | identity attributes only                      |
| Blocking "Blood Pressure Monitor" search          | search is commerce — never scanned            |

---

## Package surface (`@saludlink/privacy`)

| Export                                                                | Purpose                          |
| --------------------------------------------------------------------- | -------------------------------- |
| `validateNoPhi` / `assertNoPhi` / `isPhiFree`                         | Recursive PHI detection          |
| `strictObject` / `withNoPhi` / `phiSafeText` + field builders         | Strict Zod schemas               |
| `RegistrationSchema`, `CheckoutSchema`, `ContactFormSchema`, …        | Canonical request schemas        |
| `sanitizeObject` / `buildSafeMetadata` / `buildSafeCognitoAttributes` | Allowlist builders               |
| `captureSafeEvent` / `registerAnalyticsTransport`                     | Safe analytics                   |
| `createSafeLogger` / `redact`                                         | Redacting structured logging     |
| `withPhiFirewall` / `phiFirewallMiddleware`                           | Request firewall (Next + Medusa) |
| `inspectUrl` / `isUrlSafe` / `assertUrlSafe`                          | Keep PHI out of URLs             |
| `DataClass`                                                           | Data-classification taxonomy     |
