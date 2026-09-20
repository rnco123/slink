import * as React from "react"
import { cn } from "@saludlink/ui"

/** Centered max-width container. `width="narrow"` for editorial reading (760px). */
export function Container({
  className,
  width = "default",
  children,
}: {
  className?: string
  width?: "default" | "narrow"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 md:px-8",
        width === "narrow" ? "max-w-narrow" : "max-w-container",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Vertical rhythm section. `tone` sets the background band. */
export function Section({
  className,
  tone = "cream",
  children,
  ...rest
}: {
  className?: string
  tone?: "cream" | "sand" | "evergreen" | "white"
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  const tones = {
    cream: "bg-cream text-ink",
    sand: "bg-sand-50 text-ink",
    evergreen: "bg-evergreen-800 text-cream",
    white: "bg-surface text-ink",
  }
  return (
    <section className={cn("py-16 md:py-24", tones[tone], className)} {...rest}>
      {children}
    </section>
  )
}

/** Small eyebrow label above a heading. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "font-mono text-xs uppercase tracking-[0.18em] text-clay-500",
        className
      )}
    >
      {children}
    </p>
  )
}
