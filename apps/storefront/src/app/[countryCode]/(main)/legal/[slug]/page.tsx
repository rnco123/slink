import { Metadata } from "next"
import { notFound } from "next/navigation"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { JsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
import { getContentPage } from "@lib/data/content"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"
import { legalLinks } from "@lib/config/site"

type Params = { countryCode: string; slug: string }

// Legal/policy pages are now CMS-driven (Medusa content module) — editable from the admin,
// bilingual, and revalidated so edits appear on the site within a minute.
export const revalidate = 60

export async function generateStaticParams() {
  return legalLinks.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata(props: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { countryCode, slug } = await props.params
  const locale = resolveLocale(countryCode)
  const page = await getContentPage(slug, locale)
  if (!page) return {}
  return {
    title: page.seo_title || page.title,
    description: page.seo_description || undefined,
    alternates: alternatesFor(`/legal/${slug}`, locale),
  }
}

export default async function LegalPage(props: { params: Promise<Params> }) {
  const { countryCode, slug } = await props.params
  const locale = resolveLocale(countryCode)
  const page = await getContentPage(slug, locale)
  if (!page) notFound()

  const updatedLabel = locale === "es" ? "Última actualización" : "Last updated"
  const paragraphs = page.body.split(/\n\n+/).filter(Boolean)

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: page.title, url: `/legal/${slug}` },
        ])}
      />
      <Section tone="cream">
        <Container width="narrow">
          <Eyebrow>
            {locale === "es" ? "Legal y confianza" : "Legal & Trust"}
          </Eyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl">{page.title}</h1>
          {page.last_updated && (
            <p className="mt-4 text-sm text-ink-subtle">
              {updatedLabel}: {page.last_updated}
            </p>
          )}
          <div className="sl-prose mt-8">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Container>
      </Section>
    </>
  )
}
