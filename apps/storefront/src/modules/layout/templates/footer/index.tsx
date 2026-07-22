import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Logo } from "@components/ui/logo"
import { LanguageSwitcher } from "@components/ui/language-switcher"
import {
  siteConfig,
  legalLinks,
  companyLinks,
  conditionVerticals,
} from "@lib/config/site"
import type { Dictionary } from "@lib/i18n"
import type { Locale } from "@lib/i18n/config"

/**
 * Trust mega-footer (T10) — implements the LegitScript "footer trust stack" that every
 * certified competitor carries. Bilingual (dict-driven chrome + condition labels).
 * See docs/legitweb-rules.md.
 */
export default function Footer({
  locale,
  dict,
}: {
  locale: Locale
  dict: Dictionary
}) {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-sand-50 text-ink">
      <div className="mx-auto max-w-container px-6 py-16 md:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Brand + trust seals */}
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-muted">
              {siteConfig.tagline}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded border border-line bg-surface text-[9px] text-ink-subtle">
                LEGIT
                <br />
                SCRIPT
              </span>
              <span className="text-xs text-ink-subtle">
                {dict.footer.certificationPending}
              </span>
            </div>
            <div className="mt-5">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Shop / conditions */}
          <nav aria-label={dict.footer.shop}>
            <h2 className="font-display text-base text-evergreen-800">
              {dict.footer.shop}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              {conditionVerticals.map((c) => (
                <li key={c.slug}>
                  <LocalizedClientLink
                    href={`/conditions/${c.slug}`}
                    className="hover:text-evergreen-700"
                  >
                    {dict.conditions.verticals[c.slug].label}
                  </LocalizedClientLink>
                </li>
              ))}
              <li>
                <LocalizedClientLink
                  href="/store"
                  className="hover:text-evergreen-700"
                >
                  {dict.common.allProducts}
                </LocalizedClientLink>
              </li>
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label={dict.footer.company}>
            <h2 className="font-display text-base text-evergreen-800">
              {dict.footer.company}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <LocalizedClientLink
                    href={l.href}
                    className="hover:text-evergreen-700"
                  >
                    {l.label}
                  </LocalizedClientLink>
                </li>
              ))}
              <li>
                <LocalizedClientLink
                  href="/telemedicine"
                  className="hover:text-evergreen-700"
                >
                  {dict.nav.telehealth}
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/learn"
                  className="hover:text-evergreen-700"
                >
                  {dict.nav.learn}
                </LocalizedClientLink>
              </li>
            </ul>
          </nav>

          {/* Legal / trust stack */}
          <nav aria-label={dict.footer.legal}>
            <h2 className="font-display text-base text-evergreen-800">
              {dict.footer.legal}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              {legalLinks.map((l) => (
                <li key={l.slug}>
                  <LocalizedClientLink
                    href={`/legal/${l.slug}`}
                    className="hover:text-evergreen-700"
                  >
                    {l.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact — real entity/address/phone (LegitScript transparency) */}
          <div>
            <h2 className="font-display text-base text-evergreen-800">
              {dict.footer.contact}
            </h2>
            <address className="mt-4 space-y-1 text-sm not-italic text-ink-muted">
              <p>{siteConfig.legalEntity}</p>
              <p>{siteConfig.contact.addressLine}</p>
              <p>
                {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
                {siteConfig.contact.zip}
              </p>
              <p>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/[^0-9+]/g, "")}`}
                  className="hover:text-evergreen-700"
                >
                  {siteConfig.contact.phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="hover:text-evergreen-700"
                >
                  {siteConfig.contact.email}
                </a>
              </p>
              <p className="text-ink-subtle">{siteConfig.contact.hours}</p>
            </address>
          </div>
        </div>

        {/* Required disclaimers */}
        <div className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-ink-subtle">
          <p>{dict.footer.disclaimer}</p>
          <div className="mt-4 flex flex-col justify-between gap-2 sm:flex-row">
            <p>
              © {year} {siteConfig.legalEntity}. {dict.footer.rights}
            </p>
            <p>
              {dict.footer.statesNote}{" "}
              <LocalizedClientLink
                href="/licensing"
                className="underline hover:text-evergreen-700"
              >
                {dict.footer.seeAvailability}
              </LocalizedClientLink>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
