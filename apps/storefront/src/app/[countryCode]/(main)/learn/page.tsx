import { Metadata } from "next"

import { Eyebrow } from "@components/ui/layout-primitives"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { JsonLd, breadcrumbJsonLd } from "@lib/seo/jsonld"
import { listArticles, type CmsArticle } from "@lib/data/content"
import { getDictionary } from "@lib/i18n"
import { resolveLocale } from "@lib/i18n/config"
import { alternatesFor } from "@lib/i18n/routing"

// CMS-driven (Medusa content module), bilingual. Rendered per-request: during the
// storefront image build Medusa is unreachable, so a build-time fetch returns []
// and would bake an empty page. Dynamic rendering reads the live DB each request.
export const dynamic = "force-dynamic"

type Params = { countryCode: string }

/** Per-category accent — a type + color system instead of stock photography. */
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
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  return {
    title: dict.learn.metaTitle,
    description: dict.learn.metaDescription,
    alternates: alternatesFor("/learn", locale),
  }
}

export default async function LearnPage(props: { params: Promise<Params> }) {
  const { countryCode } = await props.params
  const locale = resolveLocale(countryCode)
  const dict = await getDictionary(locale)
  const t = dict.learn

  const articles = await listArticles(locale).catch(() => [] as CmsArticle[])
  const [featured, ...rest] = articles

  const categoryLabel = (slug?: string | null) =>
    (slug &&
      (dict.conditions.verticals as Record<string, { label: string }>)[slug]
        ?.label) ||
    slug ||
    ""

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: t.title, url: "/learn" },
        ])}
      />

      {/* Masthead */}
      <section className="bg-evergreen-900 text-cream">
        <div className="mx-auto max-w-container px-6 py-16 md:px-8 md:py-20">
          <Eyebrow className="text-gold-300">{t.eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            {t.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-sand-200">{t.intro}</p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-container px-6 py-16 md:px-8 md:py-20">
          {articles.length === 0 ? (
            <p className="text-lg text-ink-muted">{t.empty}</p>
          ) : (
            <>
              {/* Featured — large editorial lead */}
              {featured && (
                <LocalizedClientLink
                  href={`/learn/${featured.slug}`}
                  className="group block border-t-2 border-evergreen-800 pt-8"
                >
                  <div className="grid gap-8 md:grid-cols-12 md:gap-12">
                    <div className="md:col-span-8">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-block rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${accentFor(
                            featured.category
                          )}`}
                        >
                          {categoryLabel(featured.category)}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-clay-500">
                          {t.featured}
                        </span>
                      </div>
                      <h2 className="mt-5 font-display text-3xl font-medium leading-tight text-evergreen-800 transition-colors group-hover:text-evergreen-600 md:text-5xl">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
                          {featured.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col justify-end gap-4 md:col-span-4">
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-ink-subtle">{t.by}</dt>
                          <dd className="text-ink">
                            {featured.author_name || "Saludlink Editorial"}
                          </dd>
                        </div>
                        <div className="text-ink-subtle">
                          {readingMinutes(featured.body)} {t.minRead}
                        </div>
                      </dl>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-clay-500 transition-transform group-hover:translate-x-1">
                        {t.readArticle} →
                      </span>
                    </div>
                  </div>
                </LocalizedClientLink>
              )}

              {/* The rest — editorial grid */}
              {rest.length > 0 && (
                <div className="mt-16">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-ink-subtle">
                    {t.latest}
                  </h2>
                  <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((a) => (
                      <LocalizedClientLink
                        key={a.id}
                        href={`/learn/${a.slug}`}
                        className="group flex flex-col gap-4 bg-surface p-7 transition-colors hover:bg-sand-50"
                      >
                        <span
                          className={`inline-block w-fit rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${accentFor(
                            a.category
                          )}`}
                        >
                          {categoryLabel(a.category)}
                        </span>
                        <h3 className="font-display text-2xl font-medium leading-snug text-evergreen-800 transition-colors group-hover:text-evergreen-600">
                          {a.title}
                        </h3>
                        {a.excerpt && (
                          <p className="text-sm leading-relaxed text-ink-muted">
                            {a.excerpt}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-ink-subtle">
                          <span>{a.author_name || "Saludlink Editorial"}</span>
                          <span>
                            {readingMinutes(a.body)} {t.minRead}
                          </span>
                        </div>
                      </LocalizedClientLink>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-14 border-t border-line pt-6 text-xs text-ink-subtle">
                {t.disclaimer}
              </p>
            </>
          )}
        </div>
      </section>
    </>
  )
}
