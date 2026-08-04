import "server-only"
import { cookies as nextCookies, headers as nextHeaders } from "next/headers"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  type Locale,
} from "@lib/locale"

/**
 * The locale to prefix onto a redirect target from a server action.
 *
 * Server actions have no route params, so they can't read `[countryCode]` the way
 * a page can. They read the two signals the middleware maintains instead: the
 * `x-locale` header it sets on every localized request, falling back to the
 * `NEXT_LOCALE` cookie it persists, then to the default.
 *
 * Use this — never an address or region `country_code`. That segment is the
 * language, not the country, so `/${cart.shipping_address.country_code}/checkout`
 * builds `/us/checkout`, which is not a route (see `@lib/locale`).
 */
export const getRoutingLocale = async (): Promise<Locale> => {
  try {
    const fromHeader = (await nextHeaders()).get(LOCALE_HEADER)
    if (isLocale(fromHeader)) {
      return fromHeader
    }

    const fromCookie = (await nextCookies()).get(LOCALE_COOKIE)?.value
    if (isLocale(fromCookie)) {
      return fromCookie
    }
  } catch {
    // Outside a request scope — fall through to the default.
  }

  return DEFAULT_LOCALE
}

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
