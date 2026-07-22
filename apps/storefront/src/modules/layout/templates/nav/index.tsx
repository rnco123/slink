import { Suspense } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import { Logo } from "@components/ui/logo"
import { MobileMenu } from "@components/ui/mobile-menu"
import { LanguageSwitcher } from "@components/ui/language-switcher"
import { siteConfig } from "@lib/config/site"
import type { Dictionary } from "@lib/i18n"
import type { Locale } from "@lib/i18n/config"

/**
 * Editorial header (T10). Condition-first primary nav, bilingual (dict-driven), with a
 * language switcher. Cart integration preserved from the starter.
 */
export default async function Nav({
  locale,
  dict,
}: {
  locale: Locale
  dict: Dictionary
}) {
  const nav = [
    { label: dict.nav.shop, href: "/store" },
    { label: dict.nav.conditions, href: "/conditions" },
    { label: dict.nav.telehealth, href: "/telemedicine" },
    { label: dict.nav.learn, href: "/learn" },
    { label: dict.nav.about, href: "/about" },
  ]

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Trust strip — reassurance + free-shipping nudge (merchandising pattern) */}
      <div className="bg-evergreen-800 text-white text-center text-xs font-medium tracking-wide py-2 px-4">
        {dict.nav.ticker}
      </div>

      <header className="h-16 border-b border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
        <nav className="mx-auto flex h-full max-w-container items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3 md:gap-8">
            <MobileMenu nav={nav} startVisit={dict.common.startVisit} />
            <LocalizedClientLink href="/" aria-label="Saludlink home">
              <Logo />
            </LocalizedClientLink>
            <ul className="hidden items-center gap-6 md:flex">
              {nav.map((item) => (
                <li key={item.href}>
                  <LocalizedClientLink
                    href={item.href}
                    className="text-sm text-ink-muted transition-colors hover:text-evergreen-700"
                  >
                    {item.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <a
              href={siteConfig.telemedicineUrl}
              rel="noopener noreferrer"
              className="hidden rounded-pill bg-clay-500 px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-clay-600 sm:inline-flex"
            >
              {dict.common.startVisit}
            </a>
            <LocalizedClientLink
              href="/account"
              className="hidden text-sm text-ink-muted transition-colors hover:text-evergreen-700 sm:block"
              data-testid="nav-account-link"
            >
              {dict.common.account}
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  href="/cart"
                  className="text-sm text-ink-muted hover:text-evergreen-700"
                  data-testid="nav-cart-link"
                >
                  {dict.common.cart} (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
