/**
 * PHI / secret redaction for log lines surfaced through /monitoring/logs.
 *
 * This is DEFENCE IN DEPTH. Promtail already drops known-sensitive fields at
 * ingest (see infra/monitoring/config/promtail/promtail-config.yml), but the
 * Monitoring API re-scrubs every line before it reaches the admin browser so a
 * misconfigured pipeline can never leak PHI or credentials into the UI.
 *
 * The rules are intentionally conservative — over-redaction is acceptable for an
 * ops log viewer; leaking a patient email or a bearer token is not.
 */

interface Rule {
  name: string
  re: RegExp
  replace: string
}

const RULES: Rule[] = [
  // Emails (patient / customer identifiers).
  {
    name: "email",
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replace: "[REDACTED_EMAIL]",
  },
  // Bearer / API tokens and common secret prefixes.
  {
    name: "bearer",
    re: /\b[Bb]earer\s+[A-Za-z0-9._\-]+/g,
    replace: "Bearer [REDACTED_TOKEN]",
  },
  {
    name: "secret-prefix",
    re: /\b(?:sk_live|sk_test|rk_live|glsa|phc|ghp|github_pat)_[A-Za-z0-9._\-]+/g,
    replace: "[REDACTED_SECRET]",
  },
  // key/password/token=value or "password":"value" pairs.
  {
    name: "kv-secret",
    re: /("?)(password|passwd|pwd|secret|token|api[_-]?key|authorization|cookie|set-cookie)\1\s*[:=]\s*("?)[^"\s,&}]+\3/gi,
    replace: "$2=[REDACTED]",
  },
  // JWTs (three base64url segments).
  {
    name: "jwt",
    re: /\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
    replace: "[REDACTED_JWT]",
  },
  // US phone numbers (loose) — potential PHI.
  {
    name: "phone",
    re: /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g,
    replace: "[REDACTED_PHONE]",
  },
  // Credit-card-like 13-16 digit runs.
  {
    name: "pan",
    re: /(?<!\d)(?:\d[ -]?){13,16}(?!\d)/g,
    replace: "[REDACTED_PAN]",
  },
]

export function redactLine(line: string): string {
  if (!line) return line
  let out = line
  for (const rule of RULES) {
    out = out.replace(rule.re, rule.replace)
  }
  return out
}

export function redactLines(lines: string[]): string[] {
  return lines.map(redactLine)
}
