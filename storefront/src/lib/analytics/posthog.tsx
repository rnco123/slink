"use client"

/**
 * PostHog product analytics for the storefront.
 *
 * Transport: requests are reverse-proxied through `/ingest` (see next.config.js
 * rewrites) so they stay same-origin. This means the strict CSP needs no PostHog
 * host in `connect-src`, and common ad/tracker blockers can't drop our events.
 *
 * Privacy (LegitScript / telehealth context): this is a health brand, so defaults
 * are conservative — person profiles only for identified users, all inputs masked,
 * and session recording OFF. Do NOT enable session recording, or loosen masking,
 * until a BAA is in place with PostHog and PHI-bearing routes are audited.
 */

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"
import { registerAnalyticsTransport } from "@saludlink/privacy"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * Consent (roadmap task 61). Health brand → privacy-first: analytics capture is
 * OFF until the visitor explicitly grants consent via the banner. The choice is
 * stored in a first-party cookie so it persists and the banner doesn't re-show.
 *
 * This module is the ONLY place allowed to import posthog-js (ESLint), so the
 * opt-in/out helpers live here and the ConsentBanner calls them.
 */
export const CONSENT_COOKIE = "sl_analytics_consent"
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180 // 180 days

export type ConsentState = "granted" | "denied" | "unset"

export function getAnalyticsConsent(): ConsentState {
  if (typeof document === "undefined") return "unset"
  const m = document.cookie.match(
    /(?:^|;\s*)sl_analytics_consent=(granted|denied)/
  )
  return (m?.[1] as ConsentState) ?? "unset"
}

function persistConsent(state: "granted" | "denied") {
  if (typeof document === "undefined") return
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  document.cookie = `${CONSENT_COOKIE}=${state}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`
}

export function grantAnalyticsConsent() {
  persistConsent("granted")
  if (POSTHOG_KEY && posthog.__loaded) posthog.opt_in_capturing()
}

export function denyAnalyticsConsent() {
  persistConsent("denied")
  if (POSTHOG_KEY && posthog.__loaded) posthog.opt_out_capturing()
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY || posthog.__loaded) return

    posthog.init(POSTHOG_KEY, {
      // Same-origin proxy path (next.config.js rewrites → PostHog Cloud).
      api_host: "/ingest",
      // Real host, used only to build links back to the PostHog UI.
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
      defaults: "2025-05-24",
      // Only create person profiles once a user is identified (login/checkout),
      // keeping anonymous marketing traffic profile-free.
      person_profiles: "identified_only",
      // App Router pageviews are captured manually below.
      capture_pageview: false,
      capture_pageleave: true,
      // Privacy-first consent (task 61): no capture until the visitor opts in.
      opt_out_capturing_by_default: true,
      // Privacy hardening — mask input contents everywhere; recording stays off.
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
      },
    })

    // Honour a prior consent choice on load.
    if (getAnalyticsConsent() === "granted") posthog.opt_in_capturing()

    // Wire the PHI-safe analytics wrapper to PostHog. From here on, feature code
    // calls captureSafeEvent() from @saludlink/privacy — which validates the
    // payload and strips PHI — and it lands on posthog.capture via this transport.
    // This module is the ONLY place permitted to import posthog-js (see ESLint).
    registerAnalyticsTransport((event, properties) => {
      posthog.capture(event, properties)
    })
  }, [])

  if (!POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}

/**
 * App Router does not fire a native pageview on client navigation, so we emit
 * `$pageview` ourselves whenever the path or query string changes.
 */
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!pathname || !ph) return
    let url = window.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += `?${qs}`
    ph.capture("$pageview", { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}
