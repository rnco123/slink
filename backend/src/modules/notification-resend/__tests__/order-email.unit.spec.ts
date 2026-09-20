import { render } from "../service"

/**
 * The confirmation email is the ONLY place the MCM-Go claim key ever appears —
 * we keep just a SHA-256 hash, so a template that drops it leaves the buyer
 * permanently unable to claim, with nothing for support to recover. This suite
 * exists because that failure is completely silent: the key reaches the provider
 * in `data` and simply never gets rendered.
 */
describe("order-placed email — claim key", () => {
  const BASE = {
    display_id: 4,
    currency_code: "usd",
    items: [{ title: "NAD+ Injection", quantity: 1 }],
  }

  it("renders the plaintext key into the email body", () => {
    const out = render("order-placed", {
      ...BASE,
      mcm_claim_key: "k7Qm2XpD4hRt",
    })
    expect(out).not.toBeNull()
    expect(out!.html).toContain("k7Qm2XpD4hRt")
  })

  it("tells the buyer what the key is for", () => {
    const out = render("order-placed", {
      ...BASE,
      mcm_claim_key: "k7Qm2XpD4hRt",
    })
    expect(out!.html.toLowerCase()).toContain("claim")
  })

  it("omits the block entirely when there is no key", () => {
    for (const key of [null, undefined, ""]) {
      const out = render("order-placed", { ...BASE, mcm_claim_key: key })
      expect(out!.html.toLowerCase()).not.toContain("claim key")
      expect(out!.html).toContain("Thank you for your order")
    }
  })

  it("still renders the order details alongside the key", () => {
    const out = render("order-placed", {
      ...BASE,
      mcm_claim_key: "k7Qm2XpD4hRt",
    })
    expect(out!.html).toContain("NAD+ Injection")
    expect(out!.subject).toContain("#4")
  })

  it("escapes the key rather than injecting raw HTML", () => {
    const out = render("order-placed", {
      ...BASE,
      mcm_claim_key: "<script>alert(1)</script>",
    })
    expect(out!.html).not.toContain("<script>")
  })
})
