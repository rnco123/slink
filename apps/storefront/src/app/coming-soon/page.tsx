import type { Metadata } from "next"
import PreviewUnlock from "./preview-unlock"

/**
 * Coming-soon wall (roadmap task 82). Shown for every storefront route while
 * COMING_SOON is enabled and the visitor lacks a preview cookie. Deliberately
 * noindex/nofollow so search engines don't cache the holding page.
 */
export const metadata: Metadata = {
  title: "Coming Soon",
  description:
    "Saludlink is launching soon — metabolic health, thoughtfully delivered.",
  robots: { index: false, follow: false, nocache: true },
}

export default function ComingSoonPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-evergreen-900 px-6 py-16 text-center text-cream">
      {/* Soft editorial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-evergreen-700/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-gold-700/10 blur-3xl"
      />

      <main className="relative z-10 flex max-w-2xl flex-col items-center gap-8">
        <span className="font-display text-2xl font-semibold tracking-tight text-cream">
          Saludlink
        </span>

        <span className="inline-flex items-center gap-2 rounded-pill border border-gold-500/30 bg-evergreen-800/60 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-gold-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden />
          Launching soon
        </span>

        <h1 className="font-display text-4xl font-semibold leading-tight text-cream sm:text-5xl">
          Metabolic health,
          <br />
          thoughtfully delivered.
        </h1>

        <p className="max-w-lg text-base leading-relaxed text-sand-200 sm:text-lg">
          We&rsquo;re putting the finishing touches on a new way to pair
          clinician-informed products with connected telehealth care. Check back
          shortly — or step in early with a preview code.
        </p>

        <div className="mt-2">
          <PreviewUnlock />
        </div>
      </main>

      <footer className="relative z-10 mt-16 text-xs text-sand-400">
        © Saludlink, Inc. · saludlinkusa.com
      </footer>
    </div>
  )
}
