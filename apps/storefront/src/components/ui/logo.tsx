import { cn } from "@saludlink/ui"

/**
 * Saludlink wordmark: SVG mark + Fraunces wordmark. Mark is inlined (no extra request,
 * crisp at any size). `tone` switches for dark/evergreen backgrounds.
 */
export function Logo({
  className,
  tone = "default",
  showWordmark = true,
}: {
  className?: string
  tone?: "default" | "inverse"
  showWordmark?: boolean
}) {
  const wordColor = tone === "inverse" ? "text-cream" : "text-evergreen-800"
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="48" height="48" rx="12" fill="#2e5540" />
        <path
          d="M18.5 16.5a6 6 0 0 0 0 12h4"
          stroke="#fbf8f3"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M29.5 31.5a6 6 0 0 0 0-12h-4"
          stroke="#c56b4e"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M24 12.5c2.6 0 4.7 1.9 4.7 4.4-2.6 0-4.7-1.9-4.7-4.4Z"
          fill="#8fb29a"
        />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            "font-display text-xl font-medium tracking-tight",
            wordColor
          )}
        >
          Saludlink
        </span>
      )}
    </span>
  )
}
