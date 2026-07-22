import type { ReactNode } from "react"
import { formatCalendarDate } from "@lib/util/dates"

interface LegalLayoutProps {
  /** Document title, rendered as the page H1. */
  title: string
  /** Last substantive revision date, ISO 8601 (YYYY-MM-DD). */
  lastUpdated: string
  /** Optional short standfirst shown under the title. */
  intro?: ReactNode
  /** The document body — plain JSX rendered inside `.sl-prose`. */
  children: ReactNode
}

/**
 * Shared shell for every Saludlink legal / trust document.
 *
 * Renders the title, a formatted "Last updated" date, an optional intro, and
 * the document body inside `.sl-prose` for editorial reading width. Also shows
 * a standing notice that this is draft content pending legal review.
 */
export default function LegalLayout({
  title,
  lastUpdated,
  intro,
  children,
}: LegalLayoutProps) {
  // Legal "last updated" is a bare wall-date (task 83) — format without a CT
  // shift so "2026-07-22" never rolls back a day.
  const formattedDate = formatCalendarDate(lastUpdated)

  return (
    <div className="bg-cream">
      <div className="max-w-narrow mx-auto px-6 py-16 md:py-24">
        <header className="mb-10 border-b border-line pb-8">
          <p className="text-clay-500 text-sm font-medium uppercase tracking-wide">
            Legal &amp; Trust
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl text-evergreen-800">
            {title}
          </h1>
          <p className="mt-4 text-ink-muted text-sm">
            Last updated: <time dateTime={lastUpdated}>{formattedDate}</time>
          </p>
          {intro ? (
            <p className="mt-6 text-ink-muted text-lg leading-relaxed">
              {intro}
            </p>
          ) : null}
        </header>

        {/* Draft-review notice — remove once counsel has approved this document. */}
        <div
          role="note"
          className="mb-12 rounded-rounded border border-line bg-sand-50 px-5 py-4 text-sm text-ink-muted"
        >
          <strong className="text-evergreen-800">Draft for review.</strong> This
          document is draft content prepared for the Saludlink launch and is
          pending review by qualified legal counsel. It does not yet constitute
          final legal terms and may change before it takes effect.
        </div>

        <div className="sl-prose">{children}</div>

        <footer className="mt-16 border-t border-line pt-8 text-sm text-ink-muted">
          <p>
            Questions about this document? Contact us at{" "}
            <a href="mailto:[support@saludlinkusa.com]">
              [support@saludlinkusa.com]
            </a>{" "}
            or by mail at Saludlink, Inc., [PHYSICAL MAILING ADDRESS].
          </p>
        </footer>
      </div>
    </div>
  )
}
