/**
 * Data classification for the Saludlink commerce boundary.
 *
 * Every piece of data that flows through the website is classified into exactly
 * one tier. The PHI Boundary Firewall exists to guarantee that data in the
 * {@link DataClass.PROHIBITED_PHI} tier never reaches Medusa, Cognito, Postgres,
 * Stripe, PostHog, logs, APIs, or webhooks.
 *
 * The website is NOT an EMR and NOT the telemedicine application. Clinical data
 * lives exclusively inside those separate systems.
 *
 * @packageDocumentation
 */

/**
 * Classification tiers, ordered from least to most sensitive.
 *
 * - {@link DataClass.PUBLIC} — non-personal marketing/catalog data.
 * - {@link DataClass.COMMERCE} — order/cart/product data tied to a purchase.
 * - {@link DataClass.IDENTITY} — who the customer is (name, email, address).
 * - {@link DataClass.SECRET} — credentials/tokens that must never be logged.
 * - {@link DataClass.PROHIBITED_PHI} — clinical data that must NEVER exist here.
 */
export enum DataClass {
  /** Publicly shareable, non-personal (product titles, prices, locale). */
  PUBLIC = "PUBLIC",
  /** Commerce records tied to a transaction (cart, order, coupon, payment status). */
  COMMERCE = "COMMERCE",
  /** Personally identifying commerce identity (name, email, phone, address). */
  IDENTITY = "IDENTITY",
  /** Secrets that must be redacted everywhere (tokens, passwords, Stripe keys). */
  SECRET = "SECRET",
  /** Protected Health Information — categorically forbidden on this website. */
  PROHIBITED_PHI = "PROHIBITED_PHI",
}

/**
 * A single field-level classification decision produced by the firewall.
 */
export interface FieldClassification {
  /** Dotted path to the field within the inspected object (e.g. `address.city`). */
  readonly path: string
  /** The tier the field was placed in. */
  readonly dataClass: DataClass
  /**
   * Machine-readable reason, present only for rejected ({@link DataClass.PROHIBITED_PHI})
   * or redacted ({@link DataClass.SECRET}) fields. Never contains the field value.
   */
  readonly reason?: string
  /** The normalized keyword that triggered the classification, when applicable. */
  readonly matchedKeyword?: string
}

/**
 * Tiers whose data may be persisted by the commerce website.
 * {@link DataClass.PROHIBITED_PHI} is intentionally absent.
 */
export const PERSISTABLE_CLASSES: ReadonlySet<DataClass> = new Set([
  DataClass.PUBLIC,
  DataClass.COMMERCE,
  DataClass.IDENTITY,
])

/**
 * Tiers that must be redacted before logging or sending to analytics.
 */
export const REDACT_BEFORE_EGRESS: ReadonlySet<DataClass> = new Set([
  DataClass.IDENTITY,
  DataClass.SECRET,
  DataClass.PROHIBITED_PHI,
])

/**
 * True when data of the given class must never be persisted by the website.
 *
 * @param dataClass - The classification tier to test.
 * @returns `true` when the tier is forbidden from persistence.
 */
export function isProhibited(dataClass: DataClass): boolean {
  return dataClass === DataClass.PROHIBITED_PHI
}
