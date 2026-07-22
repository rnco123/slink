# PostHog analytics — privacy-safe configuration & Monitoring API surface

Saludlink already ships a **privacy-hardened PostHog** integration. This task
does **not** change it — it documents it and describes how the future Monitoring
API reads analytics aggregates. Self-hosting is covered as an option at the end.

## How it's wired today

| Piece | File | Notes |
|---|---|---|
| Client init + provider | [posthog.tsx](../../../apps/storefront/src/lib/analytics/posthog.tsx) | The **only** module allowed to import `posthog-js` (enforced by ESLint). |
| Same-origin proxy | [next.config.js](../../../apps/storefront/next.config.js) rewrites | `/ingest/*` → PostHog Cloud ingest; `/ingest/static/*` → assets host. |
| PHI-safe event wrapper | `@saludlink/privacy` (`captureSafeEvent`) | Feature code never calls `posthog.capture` directly; the wrapper validates + strips PHI before events reach the transport. |
| Env | [.env.template](../../../apps/storefront/.env.template) | `NEXT_PUBLIC_POSTHOG_KEY` (empty = analytics fully disabled), `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_INGEST_HOST`, `POSTHOG_ASSETS_HOST`. |

### Privacy posture (do not weaken without a BAA + audit)
- **Reverse-proxied through `/ingest`** — same-origin, so the strict CSP needs no
  PostHog host in `connect-src` and tracker blockers can't drop events.
- `person_profiles: "identified_only"` — anonymous marketing traffic stays
  profile-free.
- `disable_session_recording: true`, `maskAllInputs: true`, `maskTextSelector: "*"`
  — **session recording is OFF and all inputs masked**. Keep it that way until a
  PostHog BAA is signed and PHI-bearing routes are audited.
- Events flow through `@saludlink/privacy` which rejects prohibited/PHI fields —
  this is the guarantee that **no PHI reaches PostHog**.
- Key is empty by default → analytics is a no-op until deliberately enabled per env.

> **Plan alignment:** `docs/plan.md` names **self-hosted Plausible** as the
> long-term, no-PHI-to-third-parties analytics choice (T38). PostHog Cloud is the
> current implementation; both are consent-gated and PHI-free. If/when the org
> requires all analytics inside the VPC, self-host PostHog (below) or migrate to
> Plausible — the `captureSafeEvent` wrapper isolates feature code from that swap.

## Monitoring API surface (reading aggregates)

The admin panel should show **aggregate, PHI-free** analytics (pageviews, funnel,
top pages) — never per-person data. The Monitoring API reads these server-side.

| | |
|---|---|
| **Base URL** | Cloud: `https://us.posthog.com` (US) / `https://eu.posthog.com` (EU). Self-hosted: your instance. |
| **Auth** | **Personal API key** (server-side only) → `Authorization: Bearer phx_...`. Never expose in the browser; the client uses only the public project key. |
| **Permissions** | A **read-only** personal API key scoped to `query:read` / `insight:read` for the project. |
| **Rate limits** | Query endpoints ~**240/min** burst, **1200/hour** sustained per key (analytics endpoints). Cache aggregates for the panel. |

### Key endpoints
- `POST /api/projects/:project_id/query/` — HogQL query (the modern, flexible path).
- `GET /api/projects/:project_id/insights/` — saved insights (dashboards).
- `GET /api/projects/:project_id/session_recordings/` — **do not use**; recording is off.

### Example — pageviews over 7 days via HogQL
```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PH_PROJECT_ID/query/" \
  -H "Authorization: Bearer $PH_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"select toDate(timestamp) as day, count() as views from events where event = '\''$pageview'\'' and timestamp > now() - interval 7 day group by day order by day"}}'
```
```json
{
  "results": [
    ["2026-07-16", 1840],
    ["2026-07-17", 2011],
    ["2026-07-18", 1765]
  ],
  "columns": ["day", "views"]
}
```

The Monitoring API exposes this to the admin panel as
`GET /monitoring/analytics` — returning only counts/rates, no identifiers.

## Optional: self-hosted PostHog

If analytics must stay in-VPC, PostHog ships a Docker Compose (ClickHouse +
Kafka + Postgres + Redis + workers) — **resource-heavy** (~4 vCPU / 8 GB min).
It is intentionally **not** part of [docker-compose.monitoring.yml](../docker-compose.monitoring.yml)
to keep the observability stack light. To adopt it:

1. `git clone https://github.com/PostHog/posthog && cd posthog`
2. `docker compose -f docker-compose.hobby.yml up -d` on a dedicated host.
3. Point `POSTHOG_INGEST_HOST` / `NEXT_PUBLIC_POSTHOG_HOST` at the instance.
4. Same personal-API-key model applies to the Monitoring API.

Because events already route through `/ingest` and `captureSafeEvent`, switching
Cloud → self-hosted is an env change, no feature-code change.
