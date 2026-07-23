import { Metadata } from "next"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import { Button } from "@components/ui/button"
import { StateAvailabilityTable } from "@components/marketing/state-availability"
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
import { telemedicineUrl } from "@lib/config/site"
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
    title: dict.telemedicine.metaTitle,
    description: dict.telemedicine.metaDescription,
    alternates: alternatesFor("/telemedicine", locale),
  }
}

const nums = ["01", "02", "03", "04"]

export default async function TelemedicinePage(props: {
  params: Promise<Params>
}) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.telemedicine

  return (
    <>
      <JsonLd data={faqJsonLd(t.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.metaTitle, url: "/telemedicine" },
        ])}
      />

      <Section tone="cream">
        <Container>
          <Eyebrow>{dict.home.careEyebrow}</Eyebrow>
          <h1 className="mt-3 max-w-2xl text-4xl md:text-5xl">{t.heroTitle}</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">{t.heroBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              href={telemedicineUrl("telemedicine-page")}
              external
              variant="accent"
              size="lg"
            >
              {dict.common.startVisit}
            </Button>
            <a href="#availability">
              <Button variant="outline" size="lg">
                {t.checkAvailability}
              </Button>
            </a>
          </div>
        </Container>
      </Section>

      <Section tone="sand">
        <Container>
          <h2 className="text-3xl">{t.howTitle}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

      <Section tone="cream" id="availability">
        <Container>
          <h2 className="text-3xl">{t.availabilityTitle}</h2>
          <p className="mt-4 max-w-xl text-ink-muted">{t.availabilityBody}</p>
          <div className="mt-8">
            <StateAvailabilityTable
              filter="telehealth"
              labels={dict.availability}
            />
          </div>
          <p className="mt-4 text-sm text-ink-subtle">
            {dict.common.emergency}
          </p>
        </Container>
      </Section>

      <Section tone="sand">
        <Container width="narrow">
          <h2 className="text-3xl">{t.faqTitle}</h2>
          <dl className="mt-8 divide-y divide-line">
            {t.faqs.map((f) => (
              <div key={f.question} className="py-5">
                <dt className="font-display text-lg text-evergreen-800">
                  {f.question}
                </dt>
                <dd className="mt-2 text-ink-muted">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>
    </>
  )
}
