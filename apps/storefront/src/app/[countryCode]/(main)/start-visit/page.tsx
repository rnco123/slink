import { Metadata } from "next"

import { Container, Section, Eyebrow } from "@components/ui/layout-primitives"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import IntakeWizard from "@modules/intake/intake-wizard"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"

type Params = { countryCode: string }

export async function generateMetadata(props: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  return {
    title: "Start your telehealth visit",
    description:
      "Begin your Saludlink telehealth intake for weight and metabolic care.",
    alternates: alternatesFor("/start-visit", locale),
    // Intake is a private, PHI-collecting flow — keep it out of search results.
    robots: { index: false, follow: false },
  }
}

export default async function StartVisitPage() {
  return (
    <Section tone="cream">
      <Container width="narrow">
        <Eyebrow>Telehealth</Eyebrow>
        <h1 className="mt-3 text-4xl">Start your visit</h1>
        <p className="mt-4 text-ink-muted">
          This intake helps a licensed provider understand your health before a
          weight & metabolic telehealth visit. It takes about 5–10 minutes.
          Please answer honestly — your responses are used only for your care.
        </p>

        {/* Safety + privacy notices */}
        <div className="mt-6 space-y-3">
          <div className="rounded-lg border border-clay-500/30 bg-clay-50 p-4 text-sm text-clay-700">
            <strong>Not for emergencies.</strong> If you have or may have a
            medical emergency, call 911 or go to the nearest emergency room.
          </div>
          <div className="rounded-lg border border-line bg-sand-50 p-4 text-sm text-ink-muted">
            Your information is handled under our{" "}
            <LocalizedClientLink
              href="/legal/notice-of-privacy-practices"
              className="underline hover:text-evergreen-700"
            >
              Notice of Privacy Practices
            </LocalizedClientLink>{" "}
            and{" "}
            <LocalizedClientLink
              href="/legal/telehealth-consent"
              className="underline hover:text-evergreen-700"
            >
              Telehealth Consent
            </LocalizedClientLink>
            . Telehealth is available only where our providers are licensed.
          </div>
        </div>

        <div className="mt-10">
          <IntakeWizard />
        </div>
      </Container>
    </Section>
  )
}
