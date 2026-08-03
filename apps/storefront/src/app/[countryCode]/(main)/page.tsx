import { Metadata } from "next"

import { Hero } from "@components/marketing/hero"
import {
  TrustBand,
  FeaturedProducts,
  HowItWorks,
  CareBand,
} from "@components/marketing/sections"
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@lib/seo/jsonld"
import { getDictionary } from "@lib/i18n"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"

type Params = { countryCode: string }

// The home page now fetches featured products from Medusa. Render per-request:
// during the storefront image build Medusa is unreachable, so a build-time fetch
// would bake an empty products section. force-dynamic fetches the live DB each
// request (same pattern as store/learn/legal). See docs/DEPLOYMENT.md.
export const dynamic = "force-dynamic"

export async function generateMetadata(props: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  return {
    title: dict.home.metaTitle,
    description: dict.home.metaDescription,
    alternates: alternatesFor("/", locale),
  }
}

export default async function Home(props: { params: Promise<Params> }) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <Hero dict={dict} />
      <TrustBand dict={dict} />
      <FeaturedProducts dict={dict} countryCode={countryCode} />
      <HowItWorks dict={dict} />
      <CareBand dict={dict} />
    </>
  )
}
