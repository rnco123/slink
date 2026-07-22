/**
 * Presentational star rating (server-safe). Renders 5 stars with the filled
 * portion reflecting `value` (0–5). Accessible label announces the rating.
 */
type Props = {
  value: number
  size?: "small" | "medium" | "large"
  showValue?: boolean
  count?: number
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-xl",
}

const ReviewStars = ({ value, size = "medium", showValue, count }: Props) => {
  const rounded = Math.round(value)
  const label =
    count != null
      ? `${value.toFixed(1)} out of 5 stars, ${count} review${
          count === 1 ? "" : "s"
        }`
      : `${value.toFixed(1)} out of 5 stars`

  return (
    <span className={`inline-flex items-center gap-1 ${SIZE[size]}`}>
      <span
        role="img"
        aria-label={label}
        className="tracking-tight text-amber-500"
      >
        {"★".repeat(rounded)}
        <span className="text-ui-fg-muted" aria-hidden="true">
          {"★".repeat(5 - rounded)}
        </span>
      </span>
      {showValue && (
        <span className="text-ui-fg-subtle" aria-hidden="true">
          {value.toFixed(1)}
          {count != null ? ` (${count})` : ""}
        </span>
      )}
    </span>
  )
}

export default ReviewStars
