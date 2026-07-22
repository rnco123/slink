import { Metadata } from "next"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { StateAvailabilityTable } from "@components/marketing/state-availability"
import { JsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
import { siteConfig } from "@lib/config/site"
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
    title: dict.licensing.metaTitle,
    description: dict.licensing.metaDescription,
    alternates: alternatesFor("/licensing", locale),
  }
}

// LegitScript Standard 5: services must clearly disclose the states where they are available.
export default async function LicensingPage(props: {
  params: Promise<Params>
}) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.licensing

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.title, url: "/licensing" },
        ])}
      />
      <Section tone="cream">
        <Container width="narrow">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-4xl">{t.title}</h1>
          <div className="sl-prose mt-8">
            <p>{t.intro}</p>
          </div>
          <div className="mt-8">
            <StateAvailabilityTable filter="all" labels={dict.availability} />
          </div>
          <div className="sl-prose mt-10">
            <h2>{t.oversightTitle}</h2>
            <p>
              {t.oversightBody} <strong>[Dr. Name, credentials, license #]</strong>
              .
            </p>
            <h2>{t.businessTitle}</h2>
            <p>
              {siteConfig.legalEntity}
              <br />
              {siteConfig.contact.addressLine}
              <br />
              {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
              {siteConfig.contact.zip}
              <br />
              {siteConfig.contact.phone}
            </p>
            <p className="text-sm text-ink-subtle">{t.draftNote}</p>
          </div>
        </Container>
      </Section>
    </>
  )
}
