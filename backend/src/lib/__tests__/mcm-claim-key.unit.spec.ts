import crypto from "node:crypto"
import {
  KEY_LENGTH,
  claimKeyLast4,
  generateClaimKey,
  hashClaimKey,
} from "../mcm-claim-key"

/**
 * The claim key is the credential a buyer types into MCM-Go to claim an order.
 * Three things must hold or the integration breaks silently:
 *   1. at least 12 characters — MCM-Go rejects anything shorter outright;
 *   2. enough entropy that a SHA-256 hash cannot be brute-forced offline;
 *   3. a hash byte-identical to MCM-Go's, or every claim fails with no signal.
 */

/** MCM-Go's exact implementation, copied from its backend/src/saludlink.ts:31. */
const mcmGoHash = (key: string): string =>
  crypto.createHash("sha256").update(key.trim()).digest("hex")

/** MCM-Go's exact length guard, from its backend/src/saludlink.ts:80. */
const mcmGoAcceptsLength = (key: string): boolean => key.trim().length >= 12

describe("generateClaimKey", () => {
  it("is a plain 12-character key with no prefix or separators", () => {
    const key = generateClaimKey()
    expect(key).toHaveLength(12)
    expect(key).toMatch(/^[a-zA-Z0-9]{12}$/)
    expect(key).not.toContain("-")
  })

  it("satisfies MCM-Go's 12-character minimum — a shorter key is rejected 400", () => {
    for (let i = 0; i < 100; i++) {
      expect(mcmGoAcceptsLength(generateClaimKey())).toBe(true)
    }
    // Guard the constant itself: dropping below 12 breaks their ingest.
    expect(KEY_LENGTH).toBeGreaterThanOrEqual(12)
  })

  it("mixes upper case, lower case and digits across many keys", () => {
    const body = Array.from({ length: 200 }, generateClaimKey).join("")
    expect(body).toMatch(/[a-z]/)
    expect(body).toMatch(/[A-Z]/)
    expect(body).toMatch(/[0-9]/)
  })

  it("never repeats across many mints (entropy sanity)", () => {
    const keys = new Set(Array.from({ length: 2000 }, generateClaimKey))
    expect(keys.size).toBe(2000)
  })

  it("draws from a CSPRNG, not Math.random", () => {
    const spy = jest.spyOn(crypto, "randomBytes")
    generateClaimKey()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("uses the 62-symbol alphabet uniformly (rejection sampling, no modulo bias)", () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 3000; i++) {
      for (const ch of generateClaimKey()) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1)
      }
    }
    expect(counts.size).toBe(62)
    const freqs = [...counts.values()]
    const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length
    // Generous band — catches a broken/biased alphabet, not statistical noise.
    for (const f of freqs) expect(f).toBeGreaterThan(mean * 0.6)
  })
})

describe("hashClaimKey — must match MCM-Go byte for byte", () => {
  it("matches a known key/digest pair", () => {
    expect(hashClaimKey("k7Qm2XpD4hRt")).toBe(
      "72c9258d951100e81b16b04cefcdddf5b9faf97b86368b442c91f8c06216b9df"
    )
  })

  it("agrees with MCM-Go's implementation on generated keys", () => {
    for (let i = 0; i < 50; i++) {
      const key = generateClaimKey()
      expect(hashClaimKey(key)).toBe(mcmGoHash(key))
    }
  })

  it("trims before hashing, as MCM-Go does with what the buyer types", () => {
    const key = "k7Qm2XpD4hRt"
    expect(hashClaimKey(`  ${key}  `)).toBe(hashClaimKey(key))
    expect(hashClaimKey(`${key}\n`)).toBe(hashClaimKey(key))
    expect(hashClaimKey(`  ${key} `)).toBe(mcmGoHash(`  ${key} `))
  })

  it("is lowercase hex of exactly 64 characters", () => {
    const h = hashClaimKey(generateClaimKey())
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(h).toBe(h.toLowerCase())
  })

  it("is unsalted and deterministic — the same key always hashes the same", () => {
    const key = generateClaimKey()
    expect(hashClaimKey(key)).toBe(hashClaimKey(key))
  })

  it("is case-sensitive — mixed case is real entropy, not decoration", () => {
    expect(hashClaimKey("k7Qm2XpD4hRt")).not.toBe(hashClaimKey("K7qM2xPd4Hrt"))
  })
})

describe("claimKeyLast4", () => {
  it("returns the final four characters", () => {
    expect(claimKeyLast4("k7Qm2XpD4hRt")).toBe("4hRt")
  })

  it("trims first, so a padded key gives the same answer", () => {
    expect(claimKeyLast4("  k7Qm2XpD4hRt  ")).toBe("4hRt")
  })

  it("matches the tail of a freshly minted key", () => {
    const key = generateClaimKey()
    expect(key.endsWith(claimKeyLast4(key))).toBe(true)
    expect(claimKeyLast4(key)).toHaveLength(4)
  })

  it("agrees with MCM-Go's own last4 (key.slice(-4) on the trimmed key)", () => {
    const key = generateClaimKey()
    expect(claimKeyLast4(key)).toBe(key.trim().slice(-4))
  })
})
