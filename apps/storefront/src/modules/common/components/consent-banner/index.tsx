"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  getAnalyticsConsent,
  grantAnalyticsConsent,
  denyAnalyticsConsent,
} from "@lib/analytics/posthog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Cookie consent banner (roadmap task 61).
 *
 * Health brand → privacy-first: analytics capture is opt-OUT by default (see
 * posthog.tsx `opt_out_capturing_by_default`). This banner lets the visitor
 * grant or decline; the choice persists in a first-party cookie and wires
 * straight into PostHog opt-in/opt-out. Shown only until a choice is made.
 *
 * Only essential cookies (cart, auth, preview, age gate) run without consent —
 * those are strictly-necessary and not analytics.
 */
const ConsentBanner = () => {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Show only when no prior choice exists.
    setVisible(getAnalyticsConsent() === "unset")
  }, [])

  /**
   * Never on the coming-soon wall. That page is a single full-viewport holding
   * screen, and a fixed bottom banner covers its primary action ("Have a preview
   * code?") outright on short/landscape viewports.
   *
   * Safe to omit: capture is opt-OUT by default (posthog.tsx
   * `opt_out_capturing_by_default: true`, `capture_pageview: false`), so nothing
   * non-essential runs behind the wall — there is no consent to collect yet. The
   * banner appears as normal the moment the visitor unlocks and enters the site.
   */
  if (pathname === "/coming-soon") return null

  if (!visible) return null

  const choose = (grant: boolean) => {
    if (grant) grantAnalyticsConsent()
    else denyAnalyticsConsent()
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-ui-border-base bg-white/95 p-4 shadow-lg backdrop-blur"
    >
      <div className="content-container flex flex-col gap-3 small:flex-row small:items-center small:justify-between">
        <p className="text-sm text-ui-fg-subtle">
          We use essential cookies to run the site and, with your consent,
          privacy-safe analytics to improve it. We never use analytics for
          health decisions. See our{" "}
          <LocalizedClientLink
            href="/legal/privacy-policy"
            className="underline"
          >
            Privacy Policy
          </LocalizedClientLink>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            data-testid="consent-decline"
            className="rounded-md border border-ui-border-base px-4 py-2 text-sm font-medium"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            data-testid="consent-accept"
            className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-inverted"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConsentBanner
