"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import { cn } from "@saludlink/ui"

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
] as const

/**
 * Language switcher. Swaps the first path segment (the locale) and navigates, preserving
 * the rest of the path. Sets the NEXT_LOCALE cookie so the choice sticks. SEO-safe:
 * navigates to the real /es (or /en) URL rather than swapping content client-side.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname() || "/en"
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const segments = pathname.split("/")
  const current = LOCALES.some((l) => l.code === segments[1])
    ? segments[1]
    : "en"

  function switchTo(code: string) {
    if (code === current) return
    const parts = pathname.split("/")
    if (LOCALES.some((l) => l.code === parts[1])) {
      parts[1] = code
    } else {
      parts.splice(1, 0, code)
    }
    const next = parts.join("/") || `/${code}`
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    startTransition(() => router.push(next))
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-pill border border-line bg-surface p-0.5 text-xs",
        pending && "opacity-60",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => switchTo(l.code)}
          aria-pressed={current === l.code}
          className={cn(
            "rounded-pill px-2.5 py-1 font-medium transition-colors",
            current === l.code
              ? "bg-evergreen-600 text-cream"
              : "text-ink-muted hover:text-evergreen-700"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
