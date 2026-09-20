/**
 * "About this treatment" — the detailed product description, rendered as
 * separate paragraphs for readability. Lives in the LEFT column under the gallery
 * (desktop) so the sticky buy panel on the right stays compact and high, while
 * the tall image column gets balancing editorial content beside it.
 *
 * Receives paragraphs already split from the description (see toParagraphs). The
 * lead paragraph is shown up by the title in ProductInfo, so this renders the
 * remainder; it returns null when there's nothing left to show.
 */
export default function ProductAbout({
  paragraphs,
  title = "About this treatment",
}: {
  paragraphs: string[]
  title?: string
}) {
  if (!paragraphs.length) return null

  return (
    <section aria-labelledby="about-heading" className="max-w-prose">
      <h2
        id="about-heading"
        className="font-display text-xl text-evergreen-800 sm:text-2xl"
      >
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-relaxed text-ink-muted">
            {p}
          </p>
        ))}
      </div>
    </section>
  )
}
