"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { siteConfig } from "@lib/config/site"
import { LanguageSwitcher } from "@components/ui/language-switcher"
import { cn } from "@saludlink/ui"

/**
 * Mobile navigation (responsive). Hamburger toggles an accessible slide-down panel.
 * Hidden at md+ where the inline nav shows. Locks scroll while open; closes on Escape.
 * Nav items + CTA label are passed in (dict-driven) so it stays bilingual.
 */
export function MobileMenu({
  nav,
  startVisit,
}: {
  nav: { label: string; href: string }[]
  startVisit: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-evergreen-800 transition-colors hover:bg-evergreen-50"
      >
        <span className="relative block h-4 w-5">
          <span
            className={cn(
              "absolute left-0 h-0.5 w-5 bg-current transition-all duration-[var(--sl-duration)] ease-editorial",
              open ? "top-2 rotate-45" : "top-0"
            )}
          />
          <span
            className={cn(
              "absolute left-0 top-2 h-0.5 w-5 bg-current transition-opacity duration-[var(--sl-duration)]",
              open ? "opacity-0" : "opacity-100"
            )}
          />
          <span
            className={cn(
              "absolute left-0 h-0.5 w-5 bg-current transition-all duration-[var(--sl-duration)] ease-editorial",
              open ? "top-2 -rotate-45" : "top-4"
            )}
          />
        </span>
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-x-0 top-[calc(1.5rem+4rem)] z-40 origin-top border-b border-line bg-cream shadow-lg transition-all duration-[var(--sl-duration)] ease-editorial",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <nav className="mx-auto max-w-container px-6 py-4">
          <ul className="flex flex-col divide-y divide-line">
            {nav.map((item) => (
              <li key={item.href}>
                <LocalizedClientLink
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-lg text-evergreen-800"
                >
                  {item.label}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <a
              href={siteConfig.telemedicineUrl}
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-pill bg-clay-500 px-4 py-3 font-medium text-cream"
            >
              {startVisit}
            </a>
            <LanguageSwitcher className="ml-3" />
          </div>
        </nav>
      </div>
    </div>
  )
}
