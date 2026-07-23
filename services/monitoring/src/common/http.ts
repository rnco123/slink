/**
 * Minimal upstream HTTP helper built on Node 22's global fetch. Every upstream
 * call is GET-only (read-only facade) unless a caller passes a body, has a hard
 * timeout, and surfaces a typed failure instead of throwing raw network errors.
 */

export interface UpstreamResult<T> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

export interface FetchOptions {
  timeoutMs: number
  headers?: Record<string, string>
  /** Basic-auth convenience: sets the Authorization header. */
  basicAuth?: { user: string; pass: string }
}

function toBasic(user: string, pass: string): string {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
}

export async function getJson<T = unknown>(
  url: string,
  opts: FetchOptions
): Promise<UpstreamResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  }
  if (opts.basicAuth) {
    headers.Authorization = toBasic(opts.basicAuth.user, opts.basicAuth.pass)
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    })
    const status = res.status
    if (!res.ok) {
      return { ok: false, status, data: null, error: `upstream ${status}` }
    }
    const data = (await res.json()) as T
    return { ok: true, status, data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const reason = msg.includes("aborted") ? "timeout" : msg
    return { ok: false, status: 0, data: null, error: reason }
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch a plaintext body (used for Prometheus-format /metrics exposition). */
export async function getText(
  url: string,
  opts: FetchOptions
): Promise<UpstreamResult<string>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
  const headers: Record<string, string> = { ...opts.headers }
  if (opts.basicAuth) {
    headers.Authorization = toBasic(opts.basicAuth.user, opts.basicAuth.pass)
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    })
    if (!res.ok)
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `upstream ${res.status}`,
      }
    return { ok: true, status: res.status, data: await res.text() }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      status: 0,
      data: null,
      error: msg.includes("aborted") ? "timeout" : msg,
    }
  } finally {
    clearTimeout(timer)
  }
}
