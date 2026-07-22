import { Metadata } from "next"
import { notFound } from "next/navigation"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { Button } from "@components/ui/button"
import { CareBand } from "@components/marketing/sections"
import { JsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
import { conditionVerticals } from "@lib/config/site"
import { getDictionary } from "@lib/i18n"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"

type Params = { countryCode: string; slug: string }
type Slug = (typeof conditionVerticals)[number]["slug"]

const isSlug = (s: string): s is Slug =>
  conditionVerticals.some((c) => c.slug === s)

export async function generateStaticParams() {
  return conditionVerticals.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata(props: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { countryCode, slug } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  if (!isSlug(slug)) return {}
  const v = dict.conditions.verticals[slug]
  return {
    title: v.label,
    description: `${v.blurb}`,
    alternates: alternatesFor(`/conditions/${slug}`, locale),
  }
}

export default async function ConditionHub(props: {
  params: Promise<Params>
}) {
  const { countryCode, slug } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  if (!isSlug(slug)) notFound()
  const v = dict.conditions.verticals[slug]

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: dict.conditions.title, url: "/conditions" },
          { name: v.label, url: `/conditions/${slug}` },
        ])}
      />
      <Section tone="cream">
        <Container>
          <Eyebrow>{dict.conditions.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl">{v.label}</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">{v.blurb}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={`/store?category=${slug}`} variant="primary" size="lg">
              {dict.common.shopProducts}
            </Button>
            <Button href="/learn" variant="outline" size="lg">
              {dict.common.readGuides}
            </Button>
          </div>
          <div className="mt-12 rounded-xl border border-dashed border-line bg-sand-50 p-8 text-center text-ink-subtle">
            {v.label}
          </div>
        </Container>
      </Section>
      <CareBand dict={dict} />
    </>
  )
}
