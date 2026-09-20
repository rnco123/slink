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
    /**
     * Fits ONE viewport on every device — no page scroll, phone/tablet/laptop.
     *
     * - `100svh` (small viewport height) not `100vh`/`min-h-screen`: svh is the
     *   height with mobile browser chrome VISIBLE, so the layout can never be
     *   taller than what the user actually sees. `h-screen` stays as a fallback
     *   for anything predating svh.
     * - Every size is a `vmin` clamp. vmin tracks the SMALLER axis, so type and
     *   spacing shrink on a narrow phone AND on a short landscape/small-laptop
     *   viewport — the case fixed `sm:` breakpoints miss entirely.
     * - Grid rows `[1fr_auto]` centres the content and pins the footer without
     *   the old fixed `mt-16`, which was a big contributor to the overflow.
     * - Outer `overflow-hidden` guarantees no page scrollbar; `main` keeps
     *   `min-h-0 overflow-y-auto` so if a viewport is truly tiny (or the code
     *   form is open on a very short screen) the content scrolls INSIDE rather
     *   than being clipped out of reach.
     */
    <div className="relative grid h-screen h-[100svh] grid-rows-[1fr_auto] overflow-hidden bg-evergreen-900 text-center text-cream">
      {/* Soft editorial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-evergreen-700/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-gold-700/10 blur-3xl"
      />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-2xl flex-col items-center justify-center gap-[clamp(0.55rem,2.4vmin,2rem)] overflow-y-auto px-6 py-[clamp(0.75rem,3vmin,2rem)]">
        <span className="font-display text-[clamp(1rem,3.2vmin,1.5rem)] font-semibold tracking-tight text-cream">
          Saludlink
        </span>

        <span className="inline-flex items-center gap-2 rounded-pill border border-gold-500/30 bg-evergreen-800/60 px-[clamp(0.6rem,1.8vmin,1rem)] py-[clamp(0.2rem,0.8vmin,0.375rem)] text-[clamp(0.55rem,1.5vmin,0.75rem)] font-medium uppercase tracking-[0.2em] text-gold-300">
          <span
            className="h-[clamp(0.25rem,0.7vmin,0.375rem)] w-[clamp(0.25rem,0.7vmin,0.375rem)] rounded-full bg-gold-500"
            aria-hidden
          />
          Launching soon
        </span>

        <h1 className="font-display text-[clamp(1.5rem,7vmin,3.75rem)] font-semibold leading-[1.08] text-cream">
          Metabolic health,
          <br />
          thoughtfully delivered.
        </h1>

        <p className="max-w-lg text-[clamp(0.8rem,2.1vmin,1.125rem)] leading-relaxed text-sand-200">
          We&rsquo;re putting the finishing touches on a new way to pair
          clinician-informed products with connected telehealth care. Check back
          shortly — or step in early with a preview code.
        </p>

        <PreviewUnlock />
      </main>

      <footer className="relative z-10 px-6 pb-[clamp(0.5rem,2vmin,1.5rem)] text-[clamp(0.6rem,1.5vmin,0.75rem)] text-sand-400">
        © Saludlink, Inc. · saludlinkusa.com
      </footer>
    </div>
  )
}
