/**
 * Split a free-text product description into display paragraphs.
 *
 * Seeded descriptions separate paragraphs with a blank line (`\n\n`). Rendering
 * the whole blob in a single `whitespace-pre-line` <p> reads as a wall of text;
 * splitting lets the PDP show a punchy lead paragraph near the title and the
 * remaining detail in an "About this treatment" block with proper rhythm.
 */
export function toParagraphs(text?: string | null): string[] {
  if (!text) return []
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean)
}
