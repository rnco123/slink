import { Metadata } from "next"
import { notFound } from "next/navigation"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { JsonLd, breadcrumbJsonLd, articleJsonLd } from "@lib/seo/jsonld"
import { getArticle } from "@lib/data/content"
import { getDictionary } from "@lib/i18n"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"

// Dynamic for the same reason as the index: Medusa is unreachable during the
// storefront image build, so build-time rendering would bake a permanent 404.
export const dynamic = "force-dynamic"

type Params = { countryCode: string; slug: string }

const ACCENT: Record<string, string> = {
  "metabolic-health": "border-evergreen-600 bg-evergreen-50 text-evergreen-800",
  nutrition: "border-clay-500 bg-clay-50 text-clay-700",
  "weight-management": "border-gold-500 bg-sand-100 text-evergreen-800",
  monitoring: "border-sand-500 bg-sand-50 text-ink-muted",
}
const accentFor = (c?: string | null) =>
  (c && ACCENT[c]) || "border-line bg-sand-50 text-ink-muted"

const readingMinutes = (body: string) =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200))

export async function generateMetadata(props: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { countryCode, slug } = await props.params
  const locale = resolveLocale(countryCode)
  const article = await getArticle(slug, locale)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt || undefined,
    alternates: alternatesFor(`/learn/${slug}`, locale),
  }
}

export default async function ArticlePage(props: { params: Promise<Params> }) {
  const { countryCode, slug } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.learn

  const article = await getArticle(slug, locale)
  if (!article) notFound()

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean)
  const categoryLabel =
    (article.category &&
      (dict.conditions.verticals as Record<string, { label: string }>)[
        article.category
      ]?.label) ||
    article.category ||
    ""

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.title, url: "/learn" },
          { name: article.title, url: `/learn/${slug}` },
        ])}
      />
      <JsonLd
        data={articleJsonLd({
          title: article.title,
          description: article.excerpt || article.title,
          url: `/learn/${slug}`,
          // Text-first articles have no hero image; fall back to the brand mark
          // so the Article schema stays valid.
          image: "/brand/saludlink-mark.svg",
          datePublished: article.published_at || "2026-01-01",
          dateModified: article.published_at || undefined,
          authorName: article.author_name || "Saludlink Editorial",
        })}
      />

      <article className="bg-cream">
        <div className="mx-auto max-w-narrow px-6 py-14 md:py-20">
          <LocalizedClientLink
            href="/learn"
            className="text-sm text-ink-subtle transition-colors hover:text-evergreen-700"
          >
            ← {t.backToLearn}
          </LocalizedClientLink>

          <header className="mt-8">
            {categoryLabel && (
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${accentFor(
                  article.category
                )}`}
              >
                {categoryLabel}
              </span>
            )}
            <h1 className="mt-5 font-display text-4xl font-medium leading-[1.1] tracking-tight text-evergreen-800 md:text-5xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-5 text-xl leading-relaxed text-ink-muted">
                {article.excerpt}
              </p>
            )}

            {/* Byline — author + reading time. No medical-reviewer line: these
                pieces are written and cited, not clinician-reviewed. */}
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-4 text-sm text-ink-subtle">
              <span className="text-ink">
                {t.by} {article.author_name || "Saludlink Editorial"}
              </span>
              <span aria-hidden>·</span>
              <span>
                {readingMinutes(article.body)} {t.minRead}
              </span>
            </div>
          </header>

          <div className="sl-prose mt-10">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <p className="mt-12 rounded-lg border border-line bg-sand-50 p-4 text-xs text-ink-subtle">
            {t.disclaimer}
          </p>
        </div>
      </article>
    </>
  )
}
