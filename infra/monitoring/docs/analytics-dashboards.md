# PostHog dashboards — funnels + UTM convention (task 65)

Companion to [analytics-posthog.md](analytics-posthog.md) (which covers the
privacy posture + wiring). This doc defines the **funnel + dashboards** to build
in PostHog and the **UTM convention** for the telemedicine link-outs, so the
admin `GET /monitoring/analytics` surface and the marketing team read the same
numbers.

Everything here uses **only** the approved, PHI-free events already emitted —
see the registry in
[`packages/privacy/src/analytics.ts`](../../../packages/privacy/src/analytics.ts).
No event carries email/phone/address/free-text/clinical data; payloads are ids,
counts, amounts, currency, locale. Adding an event is a deliberate schema change
there — dashboards must not assume properties that don't exist.

## Approved events (ground truth)

| Event                   | Key properties (all PHI-free)                                      | Fired from (task 10)                       |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `page_viewed`           | `path`, `locale?`                                                  | (manual `$pageview` also on) route changes |
| `product_viewed`        | `product_id`, `category?`, `price?`, `currency_code?`              | PDP `products/[handle]/page.tsx`           |
| `product_added_to_cart` | `product_id`, `variant_id`, `quantity`, `price?`, `currency_code?` | `product-actions/index.tsx`                |
| `cart_viewed`           | `cart_id`, `item_count`, `subtotal?`, `currency_code?`             | `cart/page.tsx`                            |
| `checkout_started`      | `cart_id`, `item_count`, `value?`, `currency_code?`                | `checkout/page.tsx`                        |
| `order_completed`       | `order_id`, `value`, `currency_code`, `item_count`, `coupon?`      | `order/[id]/confirmed/page.tsx`            |
| `newsletter_signup`     | `source?`, `locale?`                                               | newsletter form (no email captured)        |
| `search_performed`      | `query_length`, `results_count`, `category?`                       | search (raw query never sent)              |

> PostHog auto-adds `$current_url`, `$pathname`, and `utm_*` (from the landing
> URL) to events — these power the campaign breakdowns below without any code
> change.

---

## 1. Purchase funnel (the headline dashboard)

Build a **Funnel** insight named **"Commerce — purchase funnel"** with these 5
ordered steps (each is one of the events above):

1. `product_viewed`
2. `product_added_to_cart`
3. `cart_viewed`
4. `checkout_started`
5. `order_completed`

Recommended insight settings:

- **Conversion window:** 1 day (metabolic-supplement purchase is usually
  same-session; widen to 7 days once real traffic shows longer consideration).
- **Order:** "Sequential" (steps must happen in order).
- **Breakdown:** `utm_source` (then `utm_campaign`) — see §3 — to see which
  channels convert, and `locale` to compare `en` vs `es`.
- **Exclusion steps:** none initially; add later to spot rage-quit paths.

### HogQL equivalent (what the Monitoring API runs)

Step counts over 30 days, so the panel doesn't depend on a saved insight:

```sql
select
  countIf(event = 'product_viewed')        as viewed,
  countIf(event = 'product_added_to_cart') as added,
  countIf(event = 'cart_viewed')           as cart,
  countIf(event = 'checkout_started')      as checkout,
  countIf(event = 'order_completed')       as purchased
from events
where timestamp > now() - interval 30 day
  and event in ('product_viewed','product_added_to_cart','cart_viewed','checkout_started','order_completed')
```

Drop-off between any two adjacent numbers is the optimization target. `purchased
/ viewed` is the overall conversion rate.

> The Monitoring API's `GET /monitoring/analytics` (in `services/monitoring/`)
> returns these aggregates once `POSTHOG_PROJECT_API_KEY` + `POSTHOG_PROJECT_ID`
> are set. Until then it responds `{ "configured": false }` — the dashboards
> below are built directly in PostHog in the meantime.

---

## 2. Supporting insights (one dashboard: "Saludlink — Commerce & Growth")

| Tile                        | Type    | Definition                                                                                   |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Purchase funnel             | Funnel  | The 5 steps from §1.                                                                         |
| Conversion rate (30d)       | Trend   | `order_completed` ÷ unique users with `product_viewed`, weekly.                              |
| Revenue proxy               | Trend   | `sum(order_completed.value)` by day. (Aggregate only — never per-person.)                    |
| AOV                         | Formula | `sum(order_completed.value) / count(order_completed)`.                                       |
| Top products viewed         | Trend   | `product_viewed` broken down by `product_id` (map ids → names in the panel, not in PostHog). |
| Add-to-cart rate by product | Trend   | `product_added_to_cart` ÷ `product_viewed`, breakdown `product_id`.                          |
| Search performance          | Trend   | `search_performed` avg `results_count`; count where `results_count = 0` (zero-result rate).  |
| Newsletter conversions      | Trend   | `newsletter_signup` by `source`.                                                             |
| Locale split                | Trend   | any event, breakdown `locale` (`en` vs `es`).                                                |
| Traffic by channel          | Trend   | `$pageview` breakdown `utm_source` / `utm_medium` (see §3).                                  |

Keep every tile **aggregate**. Do not add tiles that require identifying a person
(session recordings are off; person profiles are `identified_only`).

---

## 3. UTM convention

Two directions, both matter:

### 3a. Inbound campaigns → the storefront

Tag every external link you control that points at `saludlinkusa.com` with the
standard 5 UTM params. PostHog captures them automatically onto the first
pageview of the session (`$initial_utm_*` on the person, `utm_*` on events), so
the funnel and traffic tiles can break down by them with **no code change**.

| Param          | Meaning                   | Example values                                  |
| -------------- | ------------------------- | ----------------------------------------------- |
| `utm_source`   | where the click came from | `google`, `meta`, `newsletter`, `care` (portal) |
| `utm_medium`   | channel type              | `cpc`, `social`, `email`, `referral`            |
| `utm_campaign` | the campaign              | `metabolic-launch-2026q3`                       |
| `utm_content`  | which creative/placement  | `hero-a`, `footer-cta`                          |
| `utm_term`     | paid keyword (search ads) | `berberine`                                     |

Convention: **lowercase, hyphen-separated, no spaces**; `utm_campaign` ends with
a `YYYYqN` suffix so campaigns stay sortable.

### 3b. Outbound → the telemedicine portal (the link-out)

The "Start a visit" CTA sends users **off** the storefront to the telehealth
portal. It is configured centrally in
[`apps/storefront/src/lib/config/site.ts`](../../../apps/storefront/src/lib/config/site.ts)
as `siteConfig.telemedicineUrl` (env `NEXT_PUBLIC_TELEMEDICINE_URL`), and today
defaults to:

```
https://care.saludlinkusa.com?utm_source=storefront&utm_medium=cta
```

It renders from **four placements**, all reading that one value: the desktop nav,
the mobile menu, the marketing home sections, and the `/telemedicine` page.

**Why UTM here:** the portal is a separate property with its own analytics. UTM
params let `care.` attribute how many visits the storefront drives — the key
top-of-funnel metric for the telehealth side of the business — without any PHI
crossing over (UTM params are campaign metadata, not identifiers).

**Recommended convention for the link-out:**

| Param          | Value                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| `utm_source`   | `storefront`                                                                   |
| `utm_medium`   | `cta`                                                                          |
| `utm_campaign` | `telehealth-linkout`                                                           |
| `utm_content`  | the placement: `nav` \| `mobile-menu` \| `home-section` \| `telemedicine-page` |

Per-placement `utm_content` is the one gap today: all four placements share the
same URL, so the portal can't tell which CTA converts best. Closing it is a small
storefront change (build the URL per placement) — **owned by the storefront/code
session, not this monitoring session.** Suggested shape:

```ts
// apps/storefront/src/lib/config/site.ts — code-session follow-up
export function telemedicineUrl(placement: string): string {
  const base =
    process.env.NEXT_PUBLIC_TELEMEDICINE_URL || "https://care.saludlinkusa.com"
  const u = new URL(base)
  u.searchParams.set("utm_source", "storefront")
  u.searchParams.set("utm_medium", "cta")
  u.searchParams.set("utm_campaign", "telehealth-linkout")
  u.searchParams.set("utm_content", placement) // nav | mobile-menu | home-section | telemedicine-page
  return u.toString()
}
```

Until then, the single default URL still attributes storefront→portal traffic at
the source/medium level; only the per-placement breakdown is missing.

> **Optional link-out event.** If we want the _storefront's_ PostHog to also
> count outbound clicks (not just the portal's), add a `telemedicine_link_clicked`
> event to the approved registry in `packages/privacy/src/analytics.ts` with a
> `{ placement }` payload (no ids/PHI) and fire it via `captureSafeEvent` on
> click. That is a deliberate schema addition — again a code-session change, noted
> here so the dashboard's "portal referrals" tile has a home if we choose to
> build it storefront-side.

---

## Build order

1. Create the **funnel** insight (§1) — highest value, needs only existing events.
2. Assemble the **Commerce & Growth dashboard** (§2).
3. Roll out the **inbound UTM convention** (§3a) to marketing — no code needed.
4. Hand the **link-out `utm_content`** change (§3b) to the code session.
5. Wire `POSTHOG_PROJECT_API_KEY` + `POSTHOG_PROJECT_ID` into the Monitoring API
   so `/monitoring/analytics` surfaces the funnel in the admin panel.

Steps 1–3 need no deploy and no code; they can happen the moment a PostHog
project + key exist.
