"use client"

import { useState, useTransition } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { submitReview } from "@lib/data/reviews"

/**
 * Review submission form (roadmap task 21b).
 *
 * Requires a signed-in customer — on a 401 we swap the form for a "sign in"
 * prompt rather than silently failing. On success we show the moderation
 * notice (the review is pending until an admin approves it).
 *
 * PHI/privacy: the free-text stays on the review record; it is never passed to
 * analytics/logging on the client.
 */
type Props = { productId: string }

const StarPicker = ({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) => (
  <div
    className="flex items-center gap-1"
    role="radiogroup"
    aria-label="Rating"
  >
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label={`${n} star${n === 1 ? "" : "s"}`}
        onClick={() => onChange(n)}
        className={`text-2xl leading-none transition-colors ${
          n <= value ? "text-amber-500" : "text-ink-subtle hover:text-amber-300"
        }`}
      >
        ★
      </button>
    ))}
  </div>
)

const ReviewForm = ({ productId }: Props) => {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    ok: boolean
    message: string
    status?: number
  } | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)

    if (rating < 1) {
      setResult({ ok: false, message: "Please select a star rating." })
      return
    }
    if (content.trim().length < 10) {
      setResult({
        ok: false,
        message: "Please write at least 10 characters.",
      })
      return
    }

    startTransition(async () => {
      const res = await submitReview(productId, {
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        display_name: displayName.trim() || undefined,
      })
      setResult(res)
      if (res.ok) {
        setRating(0)
        setTitle("")
        setContent("")
        setDisplayName("")
      }
    })
  }

  // Not signed in → prompt to sign in instead of showing the form.
  if (result && !result.ok && result.status === 401) {
    return (
      <div className="rounded-lg border border-line p-4 text-sm text-ink-muted">
        <p className="mb-2">Please sign in to write a review.</p>
        <LocalizedClientLink
          href="/account"
          className="font-medium text-evergreen-700 hover:underline"
        >
          Sign in to your account
        </LocalizedClientLink>
      </div>
    )
  }

  if (result && result.ok) {
    return (
      <div
        role="status"
        className="rounded-lg border border-evergreen-200 bg-evergreen-50 p-4 text-sm text-evergreen-800"
        data-testid="review-submitted"
      >
        {result.message}
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4"
      data-testid="review-form"
    >
      <h3 className="font-display text-lg text-evergreen-800">
        Write a review
      </h3>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-ink-muted">Your rating</label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-name" className="text-sm text-ink-muted">
          Display name (optional)
        </label>
        <input
          id="review-name"
          type="text"
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Verified Customer"
          className="rounded border border-line bg-white px-3 py-2 text-sm text-ink transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-1 focus:ring-evergreen-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-title" className="text-sm text-ink-muted">
          Title (optional)
        </label>
        <input
          id="review-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-line bg-white px-3 py-2 text-sm text-ink transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-1 focus:ring-evergreen-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-content" className="text-sm text-ink-muted">
          Your review
        </label>
        <textarea
          id="review-content"
          required
          minLength={10}
          maxLength={4000}
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="rounded border border-line bg-white px-3 py-2 text-sm text-ink transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-1 focus:ring-evergreen-600"
        />
      </div>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-error">
          {result.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-pill bg-evergreen-700 px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-evergreen-800 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>

      <p className="text-xs text-ink-subtle">
        Reviews are moderated before they appear. Please describe your
        experience with the product — do not include medical or personal health
        details.
      </p>
    </form>
  )
}

export default ReviewForm
