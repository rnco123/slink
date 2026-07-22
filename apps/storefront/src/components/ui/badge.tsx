import * as React from "react"
import { cn } from "@saludlink/ui"

/** Pill badge for tags, trust signals, and status. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: "neutral" | "evergreen" | "clay" | "gold"
  className?: string
}) {
  const tones = {
    neutral: "bg-sand-100 text-ink-muted",
    evergreen: "bg-evergreen-100 text-evergreen-700",
    clay: "bg-clay-100 text-clay-700",
    gold: "bg-[var(--sl-gold-300)]/40 text-gold-700",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
