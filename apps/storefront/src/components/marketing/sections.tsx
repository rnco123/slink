import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { Button } from "@components/ui/button"
import { ConditionIcon } from "@components/ui/icons"
import { conditionVerticals, siteConfig } from "@lib/config/site"
import type { Dictionary } from "@lib/i18n"

/** Trust band — specific social-proof pattern (every certified competitor uses it). */
export function TrustBand({ dict }: { dict: Dictionary }) {
  const t = dict.home.trust
  const stats = [
    { value: t.a, label: t.aLabel },
    { value: t.b, label: t.bLabel },
    { value: t.c, label: t.cLabel },
    { value: t.d, label: t.dLabel },
  ]
  return (
    <div className="border-y border-line bg-sand-50">
      <Container className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-xl text-evergreen-800">{s.value}</p>
            <p className="text-sm text-ink-muted">{s.label}</p>
          </div>
        ))}
      </Container>
    </div>
  )
}

/** Condition-first entry grid — the core IA pattern from the research. */
export function ConditionGrid({ dict }: { dict: Dictionary }) {
  const t = dict.home
  return (
    <Section tone="cream">
      <Container>
        <div className="sl-scroll max-w-xl">
          <Eyebrow>{t.conditionsEyebrow}</Eyebrow>
          <h2 className="mt-3 text-3xl">{t.conditionsTitle}</h2>
          <p className="mt-4 text-ink-muted">{t.conditionsBody}</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {conditionVerticals.map((c) => {
            const v = dict.conditions.verticals[c.slug]
            return (
              <LocalizedClientLink
                key={c.slug}
                href={`/conditions/${c.slug}`}
                className="group rounded-xl border border-line bg-surface p-6 shadow-sm transition-all duration-[var(--sl-duration)] ease-editorial hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-evergreen-100 text-evergreen-600 transition-colors duration-[var(--sl-duration)] group-hover:bg-evergreen-600 group-hover:text-cream">
                  <ConditionIcon slug={c.slug} className="h-6 w-6" />
                </div>
                <h3 className="text-xl text-evergreen-800">{v.label}</h3>
                <p className="mt-2 text-sm text-ink-muted">{v.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-clay-500">
                  {dict.common.explore}
                  <span className="transition-transform duration-[var(--sl-duration)] ease-editorial group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </LocalizedClientLink>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}

/** How Saludlink works — three steps, editorial. */
export function HowItWorks({ dict }: { dict: Dictionary }) {
  const t = dict.home
  const nums = ["01", "02", "03"]
  return (
    <Section tone="sand">
      <Container>
        <Eyebrow>{t.howEyebrow}</Eyebrow>
        <h2 className="mt-3 text-3xl">{t.howTitle}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {t.steps.map((s, i) => (
            <div key={i} className="sl-scroll">
              <p className="font-mono text-sm text-clay-500">{nums[i]}</p>
              <h3 className="mt-2 text-xl text-evergreen-800">{s.t}</h3>
              <p className="mt-2 text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

/** Care band — telemedicine link-out CTA. */
export function CareBand({ dict }: { dict: Dictionary }) {
  const t = dict.home
  return (
    <Section tone="evergreen">
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <Eyebrow className="text-gold-300">{t.careEyebrow}</Eyebrow>
          <h2 className="mt-3 text-3xl text-cream">{t.careTitle}</h2>
          <p className="mt-4 text-cream/80">{t.careBody}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            href={siteConfig.telemedicineUrl}
            external
            variant="accent"
            size="lg"
          >
            {dict.common.startVisit}
          </Button>
          <LocalizedClientLink
            href="/telemedicine"
            className="text-center text-sm text-cream/80 underline hover:text-cream"
          >
            {t.careCta2}
          </LocalizedClientLink>
        </div>
      </Container>
    </Section>
  )
}
