"use client"

import { useEffect, useRef } from "react"
import {
  captureSafeEvent,
  type AnalyticsEventName,
  type AnalyticsEventPayload,
} from "@saludlink/privacy"

/**
 * Declarative funnel-event emitter (roadmap task 10).
 *
 * Server components (PDP, cart, checkout, order-confirmed) render this to fire a
 * single PHI-safe analytics event on mount. All events go through
 * `captureSafeEvent`, which validates the payload against the approved schema and
 * strips anything unexpected before it reaches PostHog — feature code never
 * touches `posthog-js` directly (ESLint-enforced).
 */
export default function TrackEvent<K extends AnalyticsEventName>({
  event,
  payload,
}: {
  event: K
  payload: AnalyticsEventPayload<K>
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    captureSafeEvent(event, payload)
    // Stringify the payload for the dependency array so a new object identity on
    // re-render doesn't re-fire (the ref already guards, this is belt-and-braces).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, JSON.stringify(payload)])

  return null
}
