import { Container, Eyebrow } from "@components/ui/layout-primitives"
import { Button } from "@components/ui/button"
import { HeroArt } from "@components/marketing/hero-art"
import type { Dictionary } from "@lib/i18n"

/**
 * Editorial hero — typographic, warm, photography-ready. Copy is dict-driven (bilingual).
 */
export function Hero({ dict }: { dict: Dictionary }) {
  const t = dict.home
  return (
    <section className="relative overflow-hidden bg-cream">
      <Container className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="sl-reveal">
          <Eyebrow>{t.heroEyebrow}</Eyebrow>
          <h1 className="mt-4 text-4xl leading-tight md:text-5xl">
            {t.heroTitleLine1}
            <br />
            <span className="text-clay-500">{t.heroTitleAccent}</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-muted">{t.heroBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/store" variant="primary" size="lg">
              {dict.common.shopProducts}
            </Button>
            <Button href="/telemedicine" variant="outline" size="lg">
              {dict.common.exploreTelehealth}
            </Button>
          </div>
          <p className="mt-5 text-sm text-ink-subtle">{t.heroReassurance}</p>
        </div>

        <div className="sl-reveal relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-xl shadow-lg md:max-w-none">
          <HeroArt className="h-full w-full" />
        </div>
      </Container>
    </section>
  )
}
