import { NextRequest, NextResponse } from "next/server"

/**
 * Locale routing middleware. Saludlink is US-only but bilingual: the first path segment is
 * the LANGUAGE (/en/…, /es/…) — distinct indexable URLs per language for SEO. The commerce
 * region is resolved to US server-side (see lib/data/regions), independent of language.
 *
 * - Valid locale prefix  → continue, remember choice in NEXT_LOCALE cookie.
 * - Missing/invalid prefix → redirect to the detected locale (cookie → Accept-Language → en).
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
