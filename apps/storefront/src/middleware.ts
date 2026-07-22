import { NextRequest, NextResponse } from "next/server"
import {
  PREVIEW_COOKIE,
  PREVIEW_TOKEN,
  isComingSoonEnabled,
} from "@lib/preview"

/**
 * Locale routing middleware. Saludlink is US-only but bilingual: the first path segment is
 * the LANGUAGE (/en/…, /es/…) — distinct indexable URLs per language for SEO. The commerce
 * region is resolved to US server-side (see lib/data/regions), independent of language.
 *
 * - Valid locale prefix  → continue, remember choice in NEXT_LOCALE cookie.
 * - Missing/invalid prefix → redirect to the detected locale (cookie → Accept-Language → en).
 *
 * Also hosts the coming-soon wall (task 82): while COMING_SOON is enabled, every
 * route is rewritten to /coming-soon unless the visitor holds the preview cookie.
 * This runs BEFORE locale routing so gated visitors never reach a localized page.
 */
const LOCALES = ["en", "es"] as const
const DEFAULT_LOCALE = "en"
const LOCALE_COOKIE = "NEXT_LOCALE"

function isLocale(v: string | undefined): v is (typeof LOCALES)[number] {
  return !!v && (LOCALES as readonly string[]).includes(v)
}

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(cookie)) return cookie

  const header = request.headers.get("accept-language")
  if (header) {
    for (const part of header.split(",")) {
      const lang = part.split(";")[0].trim().toLowerCase()
      if (lang.startsWith("es")) return "es"
      if (lang.startsWith("en")) return "en"
    }
  }
  return DEFAULT_LOCALE
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let static assets through untouched.
  if (pathname.includes(".")) {
    return NextResponse.next()
  }

  // The coming-soon page renders directly (no locale prefix, no self-rewrite).
  if (pathname === "/coming-soon") {
    return NextResponse.next()
  }

  // Coming-soon wall — gate everything else before locale routing. `/api/health`
  // is already excluded by the matcher below; robots.txt/sitemap.xml carry a dot
  // and exit above, so they stay reachable while the wall is up.
  if (isComingSoonEnabled()) {
    const hasPreview =
      request.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_TOKEN
    if (!hasPreview) {
      const url = request.nextUrl.clone()
      url.pathname = "/coming-soon"
      return NextResponse.rewrite(url)
    }
  }

  const segment = pathname.split("/")[1]

  if (isLocale(segment)) {
    // Forward the active locale so the root layout can set <html lang>.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-locale", segment)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    // Remember the active language for next visit.
    if (request.cookies.get(LOCALE_COOKIE)?.value !== segment) {
      response.cookies.set(LOCALE_COOKIE, segment, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        path: "/",
      })
    }
    return response
  }

  const locale = detectLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|brand|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
