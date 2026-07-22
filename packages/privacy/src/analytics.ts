/**
 * Safe analytics — the only sanctioned path to product analytics (PostHog).
 *
 * No feature code may import `posthog-js` directly (enforced by ESLint). Instead
 * it calls {@link captureSafeEvent}, which:
 *   1. accepts only events in the approved {@link ANALYTICS_EVENTS} registry,
 *   2. validates the payload against a strict Zod schema (extra fields rejected),
 *   3. re-scans the payload for PHI as defense-in-depth, and
 *   4. forwards the clean event to a registered transport.
 *
 * The transport is *injected* (see {@link registerAnalyticsTransport}) so this
 * package never depends on `posthog-js` and stays usable on the server, the
 * edge, and in tests.
 *
 * Payloads carry ids, counts, amounts, currency, and locale — never email,
 * phone, address, free text, or any clinical information.
 *
 * @packageDocumentation
 */

import { z } from "zod"
import { validateNoPhi } from "./validate-no-phi"

/**
 * The approved analytics events and their strict payload schemas. Adding an
 * event is a deliberate, reviewable act — and no schema may include free text
 * or contact/clinical fields.
 */
export const ANALYTICS_EVENTS = {
  page_viewed: z
    .object({
      path: z.string().max(512),
      locale: z.string().max(10).optional(),
    })
    .strict(),
  product_viewed: z
    .object({
      product_id: z.string().max(128),
      category: z.string().max(120).optional(),
      price: z.number().nonnegative().optional(),
      currency_code: z.string().length(3).optional(),
    })
    .strict(),
  product_added_to_cart: z
    .object({
      product_id: z.string().max(128),
      variant_id: z.string().max(128),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative().optional(),
      currency_code: z.string().length(3).optional(),
    })
    .strict(),
  cart_viewed: z
    .object({
      cart_id: z.string().max(128),
      item_count: z.number().int().nonnegative(),
      subtotal: z.number().nonnegative().optional(),
      currency_code: z.string().length(3).optional(),
    })
    .strict(),
  checkout_started: z
    .object({
      cart_id: z.string().max(128),
      item_count: z.number().int().nonnegative(),
      value: z.number().nonnegative().optional(),
      currency_code: z.string().length(3).optional(),
    })
    .strict(),
  order_completed: z
    .object({
      order_id: z.string().max(128),
      value: z.number().nonnegative(),
      currency_code: z.string().length(3),
      item_count: z.number().int().nonnegative(),
      coupon: z.string().max(64).optional(),
    })
    .strict(),
  newsletter_signup: z
    .object({
      // No email — analytics only needs to know the conversion happened.
      source: z.string().max(64).optional(),
      locale: z.string().max(10).optional(),
    })
    .strict(),
  /**
   * Product search. We record that a search happened and how it performed, but
   * never the raw query string (it is free text and could carry PHI).
   */
  search_performed: z
    .object({
      query_length: z.number().int().nonnegative(),
      results_count: z.number().int().nonnegative(),
      category: z.string().max(120).optional(),
    })
    .strict(),
} as const

/** Names of approved analytics events. */
export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS

/** The validated payload type for a given event. */
export type AnalyticsEventPayload<K extends AnalyticsEventName> = z.infer<
  (typeof ANALYTICS_EVENTS)[K]
>

/**
 * A transport receives fully-validated, PHI-free events. In the storefront this
 * is wired to `posthog.capture`; in tests it is a spy.
 */
export type AnalyticsTransport = (
  event: AnalyticsEventName,
  properties: Record<string, unknown>
) => void

let transport: AnalyticsTransport | null = null

/**
 * Register the analytics transport (e.g. a `posthog.capture` adapter). Call once
 * during app bootstrap. Passing `null` disables analytics (used in tests / SSR).
 *
 * @param next - The transport, or `null` to disable.
 */
export function registerAnalyticsTransport(
  next: AnalyticsTransport | null
): void {
  transport = next
}

/**
 * The outcome of a {@link captureSafeEvent} call. Never throws for invalid
 * input — analytics must not break a user flow — but reports why it was dropped.
 */
export type CaptureResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: "unknown-event" | "invalid-payload" | "phi-detected"
      readonly issues?: readonly string[]
    }

/**
 * Capture an approved analytics event after validating its payload.
 *
 * Returns a result rather than throwing: a rejected event is silently dropped
 * (and reported for logging) so a bad call site can never break checkout.
 *
 * @param event - An approved event name.
 * @param payload - The event payload; must match the event's strict schema.
 * @returns A {@link CaptureResult}.
 *
 * @example
 * ```ts
 * captureSafeEvent("order_completed", {
 *   order_id: order.id, value: 34, currency_code: "usd", item_count: 1,
 * })
 * ```
 */
export function captureSafeEvent<K extends AnalyticsEventName>(
  event: K,
  payload: AnalyticsEventPayload<K>
): CaptureResult {
  const schema = ANALYTICS_EVENTS[event]
  if (!schema) {
    return { ok: false, reason: "unknown-event" }
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid-payload",
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      ),
    }
  }

  // Defense-in-depth: even a schema-valid payload is re-scanned for PHI keys.
  const phi = validateNoPhi(parsed.data)
  if (!phi.ok) {
    return {
      ok: false,
      reason: "phi-detected",
      issues: phi.violations.map((v) => v.path),
    }
  }

  transport?.(event, parsed.data as Record<string, unknown>)
  return { ok: true }
}

/**
 * Test whether an event name is in the approved registry.
 *
 * @param event - A candidate event name.
 * @returns `true` when the event is approved.
 */
export function isApprovedEvent(event: string): event is AnalyticsEventName {
  return Object.prototype.hasOwnProperty.call(ANALYTICS_EVENTS, event)
}
