import crypto from "node:crypto"

/**
 * Per-order claim key for MCM-Go (our telehealth app).
 *
 * WHAT IT IS FOR
 * The buyer types this key into MCM-Go's signup to claim their SaludLink order
 * and receive the follow-up visit credits that came with it. MCM-Go hashes what
 * they typed and compares against the hash we stored, so the PLAINTEXT never
 * crosses the wire between the two systems — it travels from us to the buyer's
 * inbox and nowhere else.
 *
 * FORMAT: 12 plain characters, mixed case + digits, no prefix or separators —
 * e.g. `k7Qm2XpD4hRt`. Chosen deliberately over a shorter key:
 *
 *  - MCM-Go REJECTS anything under 12 characters outright. Its validator
 *    (backend/src/saludlink.ts:80) returns 400 `secret_key must be at least 12
 *    characters`, so a shorter key means the order is never ingested and can
 *    never be claimed. 12 is the floor that works with no change on their side.
 *
 *  - MCM-Go verifies with SHA-256, a FAST hash, which is only safe over a large
 *    keyspace. 12 mixed-alphanumeric characters is 62^12 ≈ 2^71, far beyond
 *    offline brute force. Eight would be 62^8 ≈ 2^47.6 — roughly 18 minutes on
 *    a commodity multi-GPU rig, and our own read API returns `secret_key_hash`
 *    and `email` together, so one leak would be enough to claim someone's
 *    credits. MCM-Go's own comment says the same:
 *
 *      "SHA-256 is sufficient here because the key is high-entropy and random.
 *       If SaludLink ever issues short or human-memorable keys, this must become
 *       a slow hash (bcrypt/argon2)."
 *
 * IF YOU SHORTEN THIS: MCM-Go must (a) relax that 12-character minimum and
 * (b) move to bcrypt/argon2 FIRST. Changing only this file silently breaks their
 * security model and their ingest, with no visible failure on our side.
 */

/**
 * Mixed case + digits: the "plain" alphabet a buyer can read off a screen and
 * type. 62 symbols.
 *
 * 62 does not divide 256, so a naive `byte % 62` would over-represent the first
 * 8 symbols and quietly cost entropy. `randomSymbol` below rejects the biased
 * tail instead — see there.
 */
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

/**
 * Key length. 12 is MCM-Go's minimum (saludlink.ts:80) AND the point at which a
 * SHA-256 hash stops being brute-forceable. Do not lower it without reading the
 * note above — both constraints bind.
 */
export const KEY_LENGTH = 12

/** Largest multiple of 62 that fits in a byte: 62 × 4 = 248. */
const UNBIASED_LIMIT = Math.floor(256 / ALPHABET.length) * ALPHABET.length

/**
 * One uniformly-random symbol, via rejection sampling.
 *
 * Bytes at or above 248 are discarded and redrawn rather than folded with a
 * modulo, which is what keeps every symbol equally likely. Rejection probability
 * is 8/256 ≈ 3%, so this terminates immediately in practice.
 */
function randomSymbol(): string {
  // Draw in small batches; a single-byte call per symbol would be 12 syscalls.
  for (;;) {
    const buf = crypto.randomBytes(8)
    for (const byte of buf) {
      if (byte < UNBIASED_LIMIT) {
        return ALPHABET[byte % ALPHABET.length]
      }
    }
  }
}

/**
 * Mint a claim key.
 *
 * Uses `crypto.randomBytes` — a CSPRNG. `Math.random` is seeded from predictable
 * state and is not safe for a credential.
 *
 * @returns e.g. `k7Qm2XpD4hRt` (12 symbols, ~71 bits)
 */
export function generateClaimKey(): string {
  let key = ""
  for (let i = 0; i < KEY_LENGTH; i++) {
    key += randomSymbol()
  }
  return key
}

/**
 * Hash a claim key for storage.
 *
 * MUST STAY BYTE-IDENTICAL TO MCM-GO. Their implementation is exactly:
 *
 *   createHash('sha256').update(key.trim()).digest('hex')
 *
 * (`.update(string)` defaults to utf8 in Node, so passing "utf8" explicitly here
 * produces the same bytes — it is spelled out only to make the contract obvious.)
 *
 * Any divergence — a salt, a pepper, a second round, base64 instead of hex,
 * uppercase hex, or skipping the trim — makes every claim fail SILENTLY: the
 * digests simply never match and the buyer is told their key is wrong.
 *
 * The `.trim()` is not cosmetic. MCM-Go trims what the buyer types, so a hash of
 * an untrimmed string can never match a key pasted with a trailing space.
 */
export function hashClaimKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim(), "utf8").digest("hex")
}

/**
 * Last 4 characters of the (trimmed) key.
 *
 * Support reads these back to confirm which key a caller is holding. It is not
 * recoverable from the hash, which is the point. Matches MCM-Go's own
 * `key.slice(-4)`.
 */
export function claimKeyLast4(key: string): string {
  return key.trim().slice(-4)
}

/** Metadata keys used to persist the hash on the order. */
export const MCM_KEY_HASH = "mcm_key_hash"
export const MCM_KEY_LAST4 = "mcm_key_last4"
