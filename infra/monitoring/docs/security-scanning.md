# Security Scanning

How Saludlink runs application, dependency, container, and secret scanning in CI, and how the
future **Monitoring** module (NestJS API) will read findings programmatically.

Saludlink is a HIPAA-ready, LegitScript-certification-ready platform. Security scanning is a hard
gate on the release path (see plan tasks **T36 CI/CD** and **T37 Hardening**). All static scanners
run on every pull request and every push to `main`; the DAST scanner runs on a schedule against
**staging** (never production, never with PHI present).

| Tool | Class | Where it runs | Fails build? | Results land in |
|------|-------|---------------|--------------|-----------------|
| OWASP ZAP | DAST (dynamic) | [`.github/workflows/dast-zap.yml`](../../../.github/workflows/dast-zap.yml) | Advisory | Workflow artifact + tracking issue |
| Trivy | SCA + IaC/secret (filesystem) | [`.github/workflows/security.yml`](../../../.github/workflows/security.yml) | Advisory (SARIF) | Security tab (code scanning) |
| Semgrep CE | SAST | [`.github/workflows/security.yml`](../../../.github/workflows/security.yml) | **Yes** (`--error`) | Security tab (code scanning) |
| Gitleaks | Secret scanning | [`.github/workflows/security.yml`](../../../.github/workflows/security.yml) | **Yes** | Job log / action output |
| npm audit | Dependency vulns | [`.github/workflows/security.yml`](../../../.github/workflows/security.yml) | **Yes** (`high+`) | Workflow artifact (JSON) |
| Dependabot | Dependency vulns + updates | [`.github/dependabot.yml`](../../../.github/dependabot.yml) | n/a (opens PRs/alerts) | Dependabot alerts + PRs |

---

## OWASP ZAP

**What it scans / purpose.** Dynamic Application Security Testing (DAST). ZAP crawls a *running*
deployment and probes it as an unauthenticated client for runtime issues that static analysis
cannot see: missing security headers, cookie flags, information disclosure, mixed content, outdated
JS libraries. We run the **baseline** profile — passive only, no active attack payloads — so it is
safe to point at a live staging environment.

**How it's wired here.** [`.github/workflows/dast-zap.yml`](../../../.github/workflows/dast-zap.yml)
runs `zaproxy/action-baseline@v0.14.0`. It is **not** on every PR — it needs a live target — so it
triggers on `workflow_dispatch` (with a `target_url` input) and weekly `schedule` (Mondays 03:00
UTC). Default target is `https://staging.saludlinkusa.com`. Rule overrides live in
[`.zap/rules.tsv`](../../../.zap/rules.tsv) (start `WARN`, tighten to `FAIL` as headers land under T16).

**Installation.**

- *CI path:* the `zaproxy/action-baseline` action pulls the `ghcr.io/zaproxy/zaproxy` image itself; no setup step needed.
- *Local run* (dockerized, points at your own staging URL):

  ```bash
  docker run --rm -v "$(pwd):/zap/wrk:rw" \
    ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t https://staging.saludlinkusa.com \
    -c rules.tsv \
    -a \
    -r report_html.html -J report_json.json -w report_md.md
  ```

  (Copy [`.zap/rules.tsv`](../../../.zap/rules.tsv) into the mounted `wrk` dir as `rules.tsv`.)

**Configuration + key env/secrets.** `target` (staging URL — must be non-production),
`rules_file_name: .zap/rules.tsv`, `cmd_options: -a` (alpha passive rules). `allow_issue_writing:
true` needs `issues: write` permission and uses the default `GITHUB_TOKEN`. No external secret.

**Verification.** After a run, download the `zap-baseline-report` artifact (`report_html.html`,
`report_json.json`, `report_md.md`) from the workflow run, or open the tracking issue the action
files/updates in the repo.

**Fail vs advisory.** **Advisory** — `fail_action: false`. The baseline reports and files an issue
but does not block. Individual rules can be promoted to `FAIL` in `rules.tsv` as the site hardens.

**Integration notes for the Monitoring module.** ZAP does not upload SARIF, so the Monitoring API
reads it via the **workflow artifacts API**: list runs with
`GET /repos/{owner}/{repo}/actions/workflows/dast-zap.yml/runs`, then
`GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts`, download the `zap-baseline-report` zip,
and parse `report_json.json` (`site[].alerts[]` with `riskcode`, `name`, `instances`). Auth: GitHub
token with `actions: read`. Base URL `https://api.github.com`.

---

## Trivy

**What it scans / purpose.** Software Composition Analysis plus IaC/misconfiguration and secret
detection over the repository filesystem. Catches vulnerable OS/library packages, insecure
Dockerfile and compose settings (relevant to `infra/monitoring`), and hard-coded secrets.

**How it's wired here.** The `trivy` job in
[`.github/workflows/security.yml`](../../../.github/workflows/security.yml) runs
`aquasecurity/trivy-action@0.28.0` with `scan-type: fs`, `scanners: vuln,secret,misconfig`,
`severity: CRITICAL,HIGH`, `ignore-unfixed: true`, output SARIF, then uploads via
`github/codeql-action/upload-sarif@v3` under category `trivy`.

**Installation.**

- *CI path:* the `trivy-action` provisions the binary.
- *Local run* (dockerized):

  ```bash
  docker run --rm -v "$(pwd):/src" aquasec/trivy:latest \
    fs /src \
    --scanners vuln,secret,misconfig \
    --severity CRITICAL,HIGH \
    --ignore-unfixed \
    --format sarif --output /src/trivy.sarif
  ```

**Configuration + key env/secrets.** No secret required for public DB pulls (optionally
`TRIVY_TOKEN`/registry creds for private images). SARIF upload uses the default `GITHUB_TOKEN` with
`security-events: write`.

**Verification.** Findings appear in **Security → Code scanning alerts** filtered by `tool: Trivy`
(category `trivy`). The SARIF artifact is also attached to the run.

**Fail vs advisory.** **Advisory** — the job uploads SARIF but is not configured to fail on
findings; gating is enforced through the Security tab / branch-protection code-scanning rules rather
than exit code.

**Integration notes for the Monitoring module.** Because Trivy uploads SARIF, the Monitoring API
reads its findings through the **GitHub code-scanning API**
(`GET /repos/{owner}/{repo}/code-scanning/alerts?tool_name=Trivy`) — see the shared example below.

---

## Semgrep Community Edition

**What it scans / purpose.** Static Application Security Testing (SAST) of source code — pattern- and
dataflow-based detection of injection, XSS, insecure crypto, dangerous Next.js/TypeScript patterns,
and secrets. Community Edition rulesets only; **no telemetry** (`SEMGREP_SEND_METRICS: off`).

**How it's wired here.** The `semgrep` job in
[`.github/workflows/security.yml`](../../../.github/workflows/security.yml) runs inside the
`semgrep/semgrep:latest` container with CE registry rulesets: `p/default`, `p/security-audit`,
`p/secrets`, `p/typescript`, `p/nextjs`, `p/owasp-top-ten`. Output is SARIF, uploaded under category
`semgrep`.

**Installation.**

- *CI path:* the job runs in the official `semgrep/semgrep` container — no install step.
- *Local run* (dockerized):

  ```bash
  docker run --rm -e SEMGREP_SEND_METRICS=off -v "$(pwd):/src" semgrep/semgrep:latest \
    semgrep scan \
      --config p/default --config p/security-audit --config p/secrets \
      --config p/typescript --config p/nextjs --config p/owasp-top-ten \
      --sarif --output /src/semgrep.sarif --error
  ```

**Configuration + key env/secrets.** No token needed for CE registry rules (`SEMGREP_APP_TOKEN` is
only for the paid Semgrep Cloud Platform, which we do not use). `SEMGREP_SEND_METRICS=off` enforces
privacy. SARIF upload uses `GITHUB_TOKEN` (`security-events: write`).

**Verification.** Findings show in **Security → Code scanning alerts** (`tool: Semgrep`, category
`semgrep`); SARIF also attached to the run.

**Fail vs advisory.** **Fails the build** — `--error` makes Semgrep exit non-zero on any finding.
The SARIF upload step still runs (`if: always()`) so findings reach the Security tab even on failure.

**Integration notes for the Monitoring module.** Read via the **GitHub code-scanning API**
(`GET /repos/{owner}/{repo}/code-scanning/alerts?tool_name=Semgrep`) — shared example below.

---

## Gitleaks

**What it scans / purpose.** Secret scanning across the working tree **and full git history** —
API keys, tokens, private keys, connection strings accidentally committed at any point.

**How it's wired here.** The `gitleaks` job in
[`.github/workflows/security.yml`](../../../.github/workflows/security.yml) checks out with
`fetch-depth: 0` (full history) and runs `gitleaks/gitleaks-action@v2` with
`GITLEAKS_CONFIG: .gitleaks.toml`. The config
([`.gitleaks.toml`](../../../.gitleaks.toml)) extends the default ruleset and allowlists safe local
placeholders (`pk_test`, `sk_test_*`, `change_me_*`, `supersecret`, `saludlink_local`) and template
paths (`*.env.template`, `docs/*.md`, `pnpm-lock.yaml`) so intentional dev defaults do not trip it.

**Installation.**

- *CI path:* provided by `gitleaks/gitleaks-action@v2`.
- *Local run* (dockerized, full history):

  ```bash
  docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest \
    detect --source=/repo --config=/repo/.gitleaks.toml --redact --verbose
  ```

  (`--redact` ensures matched secret values are never printed.)

**Configuration + key env/secrets.** `GITHUB_TOKEN` (default) for the action; `GITLEAKS_CONFIG`
points at the repo config. OSS action runs without a licence for public repos.

**Verification.** The job log lists leaks (redacted) and the run fails if any are found; a SARIF/JSON
report is produced by the action's output. Confirm a green `gitleaks` check on the PR.

**Fail vs advisory.** **Fails the build** on any finding.

**Integration notes for the Monitoring module.** Gitleaks in this workflow reports through the
action rather than the Security tab. For the Monitoring API, treat it as a **workflow-status**
signal: read the `gitleaks` check conclusion via
`GET /repos/{owner}/{repo}/actions/workflows/security.yml/runs` and the job/check-run status. **Do
not** ingest or persist any matched secret values — only the pass/fail conclusion and rule metadata.

---

## npm audit (pnpm)

**What it scans / purpose.** Known-vulnerability report over the resolved pnpm dependency tree
(uses the GitHub Advisory Database). Complements Trivy/Dependabot at the workspace-lockfile level.

**How it's wired here.** The `npm-audit` job in
[`.github/workflows/security.yml`](../../../.github/workflows/security.yml) installs with
`pnpm install --frozen-lockfile`, then `pnpm audit --audit-level=high` (gate), then produces a full
`pnpm audit --json > npm-audit.json` report uploaded as the `npm-audit-report` artifact.

**Installation.** No install — `pnpm audit` is built into pnpm.

- *Local run:*

  ```bash
  pnpm audit --audit-level=high        # same gate CI enforces
  pnpm audit --json > npm-audit.json   # full machine-readable report
  ```

**Configuration + key env/secrets.** None. `--audit-level=high` sets the failure threshold.

**Verification.** Green `npm audit` check on the PR; download the `npm-audit-report` artifact for the
full JSON (`advisories`, `metadata.vulnerabilities` counts by severity).

**Fail vs advisory.** **Fails the build** at `high` severity and above. The JSON report step is
`if: always()` with `|| true` so the artifact is produced even when the gate fails.

**Integration notes for the Monitoring module.** Read via the **workflow artifacts API**: resolve
the latest `security.yml` run, list artifacts, download `npm-audit-report`, and parse
`npm-audit.json` (`advisories[].{severity,module_name,title,url}` and `metadata.vulnerabilities`).
Auth: GitHub token with `actions: read`.

---

## GitHub Dependabot

**What it scans / purpose.** Continuously monitors manifests/lockfiles against the GitHub Advisory
Database and (a) raises **Dependabot alerts** for vulnerable dependencies and (b) opens **version
update PRs**. Covers the npm workspace, GitHub Actions, and the monitoring Docker base images.

**How it's wired here.** [`.github/dependabot.yml`](../../../.github/dependabot.yml) defines three
ecosystems: `npm` at `/` (weekly Monday 06:00 America/New_York, minor/patch grouped, majors ignored,
`open-pull-requests-limit: 10`), `github-actions` at `/` (weekly), and `docker` at
`/infra/monitoring` (weekly). Security-relevant PRs are labelled `security`.

**Installation.** Native GitHub feature — no runner install. Requires Dependabot **alerts** and
**security updates** enabled in repo Settings → Code security.

- *Local equivalent* for a quick check: `pnpm audit` (above) queries the same advisory data.

**Configuration + key env/secrets.** Config is `dependabot.yml`. No secret for public advisories;
private registries would need `registries:` + repo secrets. Alerts require the *Dependabot alerts*
setting toggled on.

**Verification.** Open **Security → Dependabot alerts**, and watch for auto-opened PRs labelled
`dependencies`/`security`.

**Fail vs advisory.** **Not a build gate** — Dependabot raises alerts and opens PRs; it never fails a
check run itself. Enforcement comes from reviewing/merging its PRs and from the alert workflow.

**Integration notes for the Monitoring module.** Read via the **Dependabot alerts API**
(`GET /repos/{owner}/{repo}/dependabot/alerts`) — example below. Auth: GitHub token with
`security_events: read` (or `repo` on a classic PAT). Base URL `https://api.github.com`.

---

## Monitoring module integration — GitHub APIs

The future NestJS Monitoring API aggregates all CI security findings by reading GitHub's REST APIs.

- **Base URL:** `https://api.github.com`
- **Auth:** a GitHub token (fine-grained PAT or GitHub App installation token) with
  **`security_events: read`** (code-scanning + Dependabot alerts) and **`actions: read`** (workflow
  runs + artifacts). A classic PAT needs the **`repo`** scope. Send as
  `Authorization: Bearer <token>` with `Accept: application/vnd.github+json`.
- **Rate limits:** 5,000 requests/hour for authenticated REST calls (per token / per installation).
  Poll on the CI cadence (per-run webhooks are preferable to tight polling), cache ETags, and back
  off on `X-RateLimit-Remaining: 0`.
- **Endpoints used:** code-scanning alerts (Semgrep, Trivy — SARIF-backed), Dependabot alerts,
  workflow runs + artifacts (ZAP, npm audit).

### Code-scanning alerts (Semgrep / Trivy)

```bash
curl -sS \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/saludlink/slink/code-scanning/alerts?state=open&tool_name=Semgrep&per_page=50"
```

Trimmed response:

```json
[
  {
    "number": 42,
    "state": "open",
    "created_at": "2026-07-20T14:02:11Z",
    "rule": {
      "id": "javascript.express.security.audit.xss",
      "severity": "error",
      "security_severity_level": "high",
      "description": "Untrusted input rendered without escaping"
    },
    "tool": { "name": "Semgrep", "version": "1.x" },
    "most_recent_instance": {
      "ref": "refs/heads/main",
      "location": {
        "path": "apps/storefront/src/modules/x/Component.tsx",
        "start_line": 88,
        "end_line": 88
      }
    },
    "html_url": "https://github.com/saludlink/slink/security/code-scanning/42"
  }
]
```

Swap `tool_name=Trivy` to pull Trivy findings from the same endpoint.

### Dependabot alerts

```bash
curl -sS \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/saludlink/slink/dependabot/alerts?state=open&severity=high&per_page=50"
```

Trimmed response:

```json
[
  {
    "number": 7,
    "state": "open",
    "dependency": {
      "package": { "ecosystem": "npm", "name": "axios" },
      "manifest_path": "apps/storefront/package.json",
      "scope": "runtime"
    },
    "security_advisory": {
      "ghsa_id": "GHSA-xxxx-xxxx-xxxx",
      "severity": "high",
      "summary": "SSRF in axios",
      "cvss": { "score": 7.5 }
    },
    "security_vulnerability": {
      "vulnerable_version_range": "< 1.7.4",
      "first_patched_version": { "identifier": "1.7.4" }
    },
    "created_at": "2026-07-19T09:31:00Z",
    "html_url": "https://github.com/saludlink/slink/security/dependabot/7"
  }
]
```

### Workflow artifacts (ZAP report, npm audit JSON)

```bash
# 1. latest run of a workflow
curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/saludlink/slink/actions/workflows/security.yml/runs?per_page=1"
# 2. artifacts for that run
curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/saludlink/slink/actions/runs/{run_id}/artifacts"
# 3. download (returns a zip)
curl -sSL -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/saludlink/slink/actions/artifacts/{artifact_id}/zip" -o report.zip
```

---

## Security & privacy posture

- **No PHI in scan reports.** DAST runs against **staging**, which is seeded with synthetic,
  non-PHI data only. Static scanners read source/config, not patient data. No scan artifact should
  ever contain protected health information.
- **Secrets are never printed.** Gitleaks runs with redaction; scanner logs must not echo secret
  values. Real secrets live in GitHub Actions secrets / the environment, never in the repo (the
  `.gitleaks.toml` allowlist covers only known-safe placeholders).
- **SARIF stays private.** Semgrep and Trivy SARIF upload to the repository's **private Security
  tab** (code scanning) — visible only to users with repo security access, never published.
- **DAST targets staging, not production.** The ZAP workflow input is documented as
  "must be a non-production staging URL"; production is never actively scanned, avoiding any risk to
  live patient traffic.
