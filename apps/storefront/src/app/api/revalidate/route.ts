import { revalidateTag, revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * On-demand ISR revalidation (roadmap task 34).
 *
 * The storefront caches Medusa reads with time-based ISR (revalidate: 60) so
 * admin edits appear within a minute automatically. This endpoint lets Medusa
 * (an admin subscriber / webhook) push an INSTANT refresh of a specific cache
 * tag or path on content/product changes.
 *
 * Auth: a shared secret (`REVALIDATE_SECRET`, see env contract). No secret set,
 * or a mismatch, is rejected. Lives under /api so it bypasses the coming-soon
 * wall (same as /api/health).
 *
 * POST /api/revalidate?secret=…  body: { tag?: string, path?: string }
 */
export async function POST(req: NextRequest) {
  const secret =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-revalidate-secret")

  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    tag?: string
    path?: string
  }

  if (!body.tag && !body.path) {
    return NextResponse.json(
      { message: "Provide a `tag` or `path` to revalidate." },
      { status: 400 }
    )
  }

  if (body.tag) revalidateTag(body.tag)
  if (body.path) revalidatePath(body.path)

  return NextResponse.json({
    revalidated: true,
    tag: body.tag ?? null,
    path: body.path ?? null,
  })
}
