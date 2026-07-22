import { describe, it, expect, vi } from "vitest"
import {
  evaluateBody,
  withPhiFirewall,
  phiFirewallMiddleware,
  PHI_REJECTION_MESSAGE,
  type ExpressLikeRequest,
  type ExpressLikeResponse,
} from "../middleware"

describe("evaluateBody", () => {
  it("passes a clean commerce body", () => {
    expect(evaluateBody({ cart_id: "c1", locale: "en" }).ok).toBe(true)
  })

  it("rejects a body with PHI and returns a non-echoing 400", () => {
    const verdict = evaluateBody({ diagnosis: "hypertension crisis" })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.status).toBe(400)
      expect(verdict.body.message).toBe(PHI_REJECTION_MESSAGE)
      expect(verdict.body.fields).toContain("diagnosis")
      expect(JSON.stringify(verdict.body)).not.toContain("hypertension")
    }
  })
})

describe("withPhiFirewall (Next App Router)", () => {
  const makeRequest = (method: string, body?: unknown) =>
    new Request("http://local.test/api/x", {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })

  it("blocks a POST containing PHI with HTTP 400", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }))
    const wrapped = withPhiFirewall(handler)
    const res = await wrapped(makeRequest("POST", { symptoms: "cough" }))
    expect(res.status).toBe(400)
    expect(handler).not.toHaveBeenCalled()
    const json = (await res.json()) as { message: string }
    expect(json.message).toBe(PHI_REJECTION_MESSAGE)
  })

  it("lets a clean POST through and preserves the body for the handler", async () => {
    const handler = vi.fn(async (req: Request) => {
      const body = (await req.json()) as { cart_id: string }
      return Response.json({ received: body.cart_id })
    })
    const wrapped = withPhiFirewall(handler)
    const res = await wrapped(makeRequest("POST", { cart_id: "c1" }))
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(await res.json()).toEqual({ received: "c1" })
  })

  it("does not inspect non-guarded methods (GET)", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }))
    const wrapped = withPhiFirewall(handler)
    const res = await wrapped(makeRequest("GET"))
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("scans free text when configured (contact-form style)", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }))
    const wrapped = withPhiFirewall(handler, { scanAllText: true })
    const res = await wrapped(
      makeRequest("POST", { message: "I need a prescription refill" })
    )
    expect(res.status).toBe(400)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe("phiFirewallMiddleware (Medusa / Express)", () => {
  const makeRes = () => {
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    return { res: { status } as unknown as ExpressLikeResponse, status, json }
  }

  it("responds 400 and stops the chain on PHI", () => {
    const mw = phiFirewallMiddleware()
    const { res, status, json } = makeRes()
    const next = vi.fn()
    const req: ExpressLikeRequest = { method: "POST", body: { patient_id: "p1" } }
    mw(req, res, next)
    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledTimes(1)
    expect(next).not.toHaveBeenCalled()
  })

  it("calls next() for a clean body", () => {
    const mw = phiFirewallMiddleware()
    const { res } = makeRes()
    const next = vi.fn()
    mw({ method: "PUT", body: { locale: "en" } }, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("calls next() for non-guarded methods without inspecting the body", () => {
    const mw = phiFirewallMiddleware()
    const { res } = makeRes()
    const next = vi.fn()
    mw({ method: "GET", body: { diagnosis: "x" } }, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
