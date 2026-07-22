import { Metadata } from "next"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
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
    title: dict.contact.metaTitle,
    description: dict.contact.metaDescription,
    alternates: alternatesFor("/contact", locale),
  }
}

export default async function ContactPage(props: { params: Promise<Params> }) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.contact

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.title, url: "/contact" },
        ])}
      />
      <Section tone="cream">
        <Container width="narrow">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-4xl">{t.title}</h1>
          <p className="mt-6 text-lg text-ink-muted">{t.intro}</p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-xl text-evergreen-800">{t.supportTitle}</h2>
              <p className="mt-2 text-ink-muted">{t.supportBody}</p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="mt-3 inline-block text-clay-500 hover:underline"
              >
                {siteConfig.contact.email}
              </a>
              <p className="mt-1 text-ink-muted">
                <a
                  href={`tel:${siteConfig.contact.phone.replace(
                    /[^0-9+]/g,
                    ""
                  )}`}
                  className="hover:text-evergreen-700"
                >
                  {siteConfig.contact.phone}
                </a>
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-xl text-evergreen-800">{t.addressTitle}</h2>
              <address className="mt-2 not-italic text-ink-muted">
                {siteConfig.legalEntity}
                <br />
                {siteConfig.contact.addressLine}
                <br />
                {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
                {siteConfig.contact.zip}
              </address>
            </div>
          </div>

          <p className="mt-8 text-sm text-ink-subtle">
            {t.privacyNote}{" "}
            <LocalizedClientLink
              href="/legal/privacy-policy"
              className="underline hover:text-evergreen-700"
            >
              {dict.footer.legal}
            </LocalizedClientLink>
            . {t.accessibilityNote}{" "}
            <LocalizedClientLink
              href="/legal/accessibility"
              className="underline hover:text-evergreen-700"
            >
              {dict.footer.legal}
            </LocalizedClientLink>
            .
          </p>
        </Container>
      </Section>
    </>
  )
}
