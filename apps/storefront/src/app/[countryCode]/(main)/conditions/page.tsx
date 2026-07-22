import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { ConditionIcon } from "@components/ui/icons"
import { conditionVerticals } from "@lib/config/site"
import { JsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
import { getDictionary } from "@lib/i18n"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"

type Params = { countryCode: string }

export async function generateMetadata(props: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  return {
    title: dict.conditions.metaTitle,
    description: dict.conditions.metaDescription,
    alternates: alternatesFor("/conditions", locale),
  }
}

export default async function ConditionsIndex(props: {
  params: Promise<Params>
}) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.conditions

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.title, url: "/conditions" },
        ])}
      />
      <Section tone="cream">
        <Container>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl">{t.title}</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">{t.body}</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {conditionVerticals.map((c) => {
              const v = t.verticals[c.slug]
              return (
                <LocalizedClientLink
                  key={c.slug}
                  href={`/conditions/${c.slug}`}
                  className="group rounded-xl border border-line bg-surface p-8 shadow-sm transition-all duration-[var(--sl-duration)] ease-editorial hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-evergreen-100 text-evergreen-600 transition-colors group-hover:bg-evergreen-600 group-hover:text-cream">
                    <ConditionIcon slug={c.slug} className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl text-evergreen-800">{v.label}</h2>
                  <p className="mt-3 text-ink-muted">{v.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-clay-500">
                    {dict.common.explore} {v.label}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </LocalizedClientLink>
              )
            })}
          </div>
        </Container>
      </Section>
    </>
  )
}
