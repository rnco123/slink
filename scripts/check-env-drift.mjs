#!/usr/bin/env node
/**
 * Env template drift check (roadmap task 60).
 * -------------------------------------------------------------------------
 * Ensures every environment variable VALIDATED by a zod schema (src/lib/env.ts)
 * is also documented in the matching `.env.template`. If the code starts
 * requiring a variable that the template never mentions, a new developer (or a
 * deploy) has no way to know it exists — this fails fast in CI instead.
 *
 * Direction that FAILS: schema key missing from template (undocumented contract).
 * Direction that is INFO only: template key not in schema (passthrough vars the
 * code reads directly without validation, e.g. S3_ENDPOINT, MEDUSA_ADMIN_*).
 *
 * No dependencies, no build step — pure string parsing so it runs anywhere.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

// Framework/runtime-provided vars that are validated for correctness but are
// NOT app config a developer sets in a template (the runtime supplies them).
const RUNTIME_PROVIDED = new Set(["NODE_ENV"])

const PAIRS = [
  {
    name: "storefront",
    schema: "apps/storefront/src/lib/env.ts",
    template: "apps/storefront/.env.template",
  },
  {
    name: "medusa",
    schema: "apps/medusa/src/lib/env.ts",
    template: "apps/medusa/.env.template",
  },
]

/** Extract top-level keys from the `RawEnv = z.object({ ... })` block. */
function schemaKeys(src) {
  const start = src.indexOf("z.object({")
  if (start === -1) return []
  // Grab everything up to the matching close; good enough for our flat schemas.
  const body = src.slice(start)
  const keys = new Set()
  const re = /^\s{2}([A-Z][A-Z0-9_]+):/gm
  let m
  while ((m = re.exec(body))) keys.add(m[1])
  return [...keys]
}

/** Extract `KEY=` names from an .env template (ignores comments/blanks). */
function templateKeys(src) {
  const keys = new Set()
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const m = t.match(/^([A-Z][A-Z0-9_]+)=/)
    if (m) keys.add(m[1])
  }
  return keys
}

let failed = false

for (const pair of PAIRS) {
  const schemaSrc = readFileSync(resolve(root, pair.schema), "utf8")
  const templateSrc = readFileSync(resolve(root, pair.template), "utf8")

  const inSchema = schemaKeys(schemaSrc).filter((k) => !RUNTIME_PROVIDED.has(k))
  const inTemplate = templateKeys(templateSrc)

  const missingFromTemplate = inSchema.filter((k) => !inTemplate.has(k))
  const templateOnly = [...inTemplate].filter((k) => !inSchema.includes(k))

  console.log(`\n[${pair.name}] ${inSchema.length} validated vars`)
  if (missingFromTemplate.length) {
    failed = true
    console.error(
      `  ✗ DRIFT — validated but missing from ${pair.template}:\n` +
        missingFromTemplate.map((k) => `      - ${k}`).join("\n")
    )
  } else {
    console.log(`  ✓ every validated var is documented in the template`)
  }
  if (templateOnly.length) {
    console.log(
      `  · passthrough (in template, not validated): ${templateOnly.join(", ")}`
    )
  }
}

if (failed) {
  console.error(
    "\n✗ Env template drift detected. Add the missing var(s) to the .env.template" +
      " (and docs/ENVIRONMENT.md), or remove them from the zod schema.\n"
  )
  process.exit(1)
}
console.log("\n✓ Env templates are in sync with the validation schemas.\n")
