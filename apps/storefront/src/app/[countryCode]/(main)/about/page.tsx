import { Metadata } from "next"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { JsonLd, organizationJsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
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
    title: dict.about.metaTitle,
    description: dict.about.metaDescription,
    alternates: alternatesFor("/about", locale),
  }
}

export default async function AboutPage(props: { params: Promise<Params> }) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.about

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.title, url: "/about" },
        ])}
      />
      <Section tone="cream">
        <Container width="narrow">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl">{t.title}</h1>
          <div className="sl-prose mt-8">
            <p>{t.intro}</p>
            <h2>{t.believeTitle}</h2>
            <ul>
              {t.beliefs.map((b) => (
                <li key={b.t}>
                  <strong>{b.t}</strong> {b.d}
                </li>
              ))}
            </ul>
            <h2>{t.whoTitle}</h2>
            <p>{t.whoBody}</p>
          </div>
        </Container>
      </Section>
    </>
  )
}
