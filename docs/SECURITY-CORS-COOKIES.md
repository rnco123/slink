# Security contract — CORS, cookies & rate limiting

Covers roadmap tasks **50** (app-level rate limiting) and **52** (CORS lockdown +
cookie flags). This is the reference for how cross-origin access, session/auth
cookies, and abuse throttling are configured across the Medusa backend and the
Next.js storefront.

---

## 1. CORS contract

### Backend (Medusa) — `apps/medusa/medusa-config.ts` → `projectConfig.http`

Three separate allow-lists, each a comma-separated origin list from env:

| Config      | Env var      | What it gates                                   |
| ----------- | ------------ | ----------------------------------------------- |
| `storeCors` | `STORE_CORS` | Storefront → `/store/*` Store API               |
| `adminCors` | `ADMIN_CORS` | Admin dashboard → `/admin/*` Admin API          |
| `authCors`  | `AUTH_CORS`  | Both surfaces → `/auth/*` authentication routes |

- **Local dev defaults** (used only when the env var is unset): `http://localhost:8000`
  (store), `http://localhost:9000,http://localhost:5173` (admin), and the union
  for auth.
- **Production is env-driven and https-only.** `apps/medusa/src/lib/env.ts`
  (`validateMedusaEnv`, task 74) runs at every boot and **hard-fails** if any
  origin in `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` is not `https://…` when
  `NODE_ENV=production`. A misconfigured prod CORS therefore refuses to boot
  rather than silently allowing an http origin. (The check is skipped during
  `medusa build` / `db:migrate` tooling phases so CI's placeholder env stays
  green.)

**Production values** (single-box deploy):

```
STORE_CORS=https://saludlinkusa.com
ADMIN_CORS=https://manage.saludlinkusa.com
AUTH_CORS=https://saludlinkusa.com,https://manage.saludlinkusa.com
```

No wildcards. Add a new origin only by editing the env on the box (SSM) — never
in code.

### Storefront (Next.js)

The storefront is same-origin with its own API routes and talks to Medusa
server-side (SSR/Server Actions) using the publishable key + bearer JWT, so it
does not rely on browser CORS for the Store API. Public browser calls are
proxied same-origin (e.g. the PostHog `/ingest` proxy).

---

## 2. Cookie contract

### Medusa admin session cookie — `projectConfig.cookieOptions`

> Note: this option lives at `projectConfig.cookieOptions` in Medusa v2.17, NOT
> under `projectConfig.http`.

Set on the `connect.sid` session cookie Medusa issues for the admin dashboard:

| Flag       | Value          | Why                                                                                                          |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `httpOnly` | `true`         | JS can't read it — XSS can't exfiltrate the session.                                                         |
| `sameSite` | `lax`          | Sent on top-level navigations (admin login redirects work) but not cross-site subrequests (CSRF mitigation). |
| `secure`   | `true` in prod | https-only in prod; **off in dev** so localhost http works. Driven by `NODE_ENV`.                            |

`cookieSecret` (signs the cookie) and `jwtSecret` come from env and are
validated as real, ≥16-char, non-default secrets in production by `env.ts`.

### Storefront customer auth cookie — `apps/storefront/src/lib/data/cookies.ts`

Customer auth uses a **bearer JWT** the storefront stores in a cookie it sets
itself (`_medusa_jwt`), plus `_medusa_cart_id`. Both already ship with:

- `httpOnly: true`
- `sameSite: "strict"`
- `secure: process.env.NODE_ENV === "production"`
- `maxAge`: 7 days

Other first-party cookies (`preview_ok` coming-soon wall, `age_verified` age
gate) follow the same httpOnly + secure-in-prod pattern where they are set.

---

## 3. Rate limiting — `apps/medusa/src/api/rate-limit.ts` + `middlewares.ts`

Per-IP, Redis-backed **fixed-window** limiter attached to the abuse-prone
surfaces. The counter lives in the Medusa **cache module**, which is
Redis-backed in every non-dev environment, so the budget is correct across all
server processes / replicas hitting the same Redis (an in-memory Map would be
per-process and trivially multiplied by rotating replicas).

| Surface           | Route matcher                      | Default limit | Env override              |
| ----------------- | ---------------------------------- | ------------- | ------------------------- |
| Authentication    | `/auth/*`                          | 10 / min / IP | `RATE_LIMIT_AUTH_MAX`     |
| Checkout complete | `POST /store/carts/:id/complete`   | 15 / min / IP | `RATE_LIMIT_CHECKOUT_MAX` |
| Review submission | `POST /store/products/:id/reviews` | 5 / min / IP  | `RATE_LIMIT_REVIEW_MAX`   |

Behaviour:

- **Client IP** is taken from the **rightmost** hop of `x-forwarded-for` — the
  address the single trusted proxy (Caddy) appended, which is the real connecting
  peer. The leftmost entries are client-supplied and spoofable, so keying on them
  would let an attacker rotate a fake value per request and evade the limit.
  Falls back to `req.ip` / socket address when hit directly (dev / no proxy). If
  a CDN or extra proxy is ever placed in front of Caddy, revisit the trusted-hop
  count.
- On limit, responds **429** with `Retry-After` and `RateLimit-Limit /
-Remaining / -Reset` headers.
- **Fail-open:** if the cache backend errors, the request is allowed through —
  rate limiting is a mitigation layer, never the only control (auth still
  applies). The review POST limiter is ordered **before** the auth middleware so
  an anonymous flood is rejected cheaply by IP.

### Trade-off / known limitation

The cache-module counter is a read-modify-write, so under an extreme concurrent
burst two requests can read the same count and both pass — a minor over-count
bounded by concurrency, **not a bypass**. A strictly atomic counter would use
Redis `INCR`, which needs `ioredis` as a **direct** dependency of the Medusa app
(it is only a transitive dep today). If that stricter guarantee is ever needed,
add `ioredis` and swap the `cache.get`/`cache.set` pair for an `INCR` + `EXPIRE`
pipeline in `rate-limit.ts`.

### Contact form

The storefront `/contact` page is a **static mailto page** — there is no form
submission endpoint, so there is no server surface to rate-limit. If a contact
or newsletter POST is added later, wrap its handler with `rateLimit()` (Medusa
route) or apply the same per-IP window in the storefront Server Action / API
route.

## Admin brute-force posture (roadmap task 51)

The admin login (`manage.saludlinkusa.com`) is public and has no WAF, so the
auth surface is hardened at the app layer:

**Implemented**

- **Per-IP rate limiting on all auth flows** (`/auth/*`, 10 req/min/IP — task
  50). This is the primary brute-force control: it caps how fast an attacker can
  guess credentials from any single source, for both admin and customer auth,
  and returns `429` + `Retry-After`.
- **Secure session cookies** — `httpOnly` + `SameSite=lax` + `Secure` in prod
  (task 52), so a stolen session token can't be read by JS or replayed
  cross-site.
- **Append-only audit log** of admin actions (audit-log module) for post-hoc
  review of suspicious activity.

**Operational policy (enforce administratively until code-enforced)**

- **Password policy:** admin passwords ≥ 12 chars, mixed classes, not reused;
  rotate on suspected compromise. Admins are invited via Settings → Users (no
  self-service admin signup), which limits the attack surface to known accounts.
- **MFA:** enable an MFA layer before real customer data (parked with task 41).

**Documented follow-up (needs Medusa auth-provider customization)**

- **Per-account lockout** (lock after N failed attempts within a window) and
  **emailpass complexity enforcement** require wrapping/overriding the
  `@medusajs/auth-emailpass` provider — the built-in provider exposes no
  password-policy or lockout hooks, and a route middleware can't observe whether
  a login _succeeded_ (only the provider sees that), so a correct lockout must
  live in the provider. This is a larger, higher-risk change (a bug there locks
  out legitimate admins), deliberately deferred rather than rushed. Until then
  the per-IP limit above is the active brute-force control.
