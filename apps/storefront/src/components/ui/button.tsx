import * as React from "react"
import { cn } from "@saludlink/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Saludlink button. Variants: primary (evergreen), accent (clay CTA — use sparingly for
 * the single most important action on a view), outline, ghost. Renders as <button>, an
 * internal LocalizedClientLink (href starting with "/"), or an external <a>.
 */
type Variant = "primary" | "accent" | "outline" | "ghost"
type Size = "sm" | "md" | "lg"

const base =
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium leading-none transition-all duration-[var(--sl-duration)] ease-editorial outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:pointer-events-none active:translate-y-0"

const variants: Record<Variant, string> = {
  primary:
    "bg-evergreen-600 text-cream shadow-sm hover:bg-evergreen-700 hover:shadow hover:-translate-y-0.5",
  accent:
    "bg-clay-500 text-cream shadow-sm hover:bg-clay-600 hover:shadow hover:-translate-y-0.5",
  outline:
    "border border-evergreen-600/70 text-evergreen-700 hover:border-evergreen-700 hover:bg-evergreen-50 hover:-translate-y-0.5",
  ghost: "text-evergreen-700 hover:bg-evergreen-50",
}

// Valid Tailwind heights only (h-13 does not exist — that was the earlier bug).
const sizes: Record<Size, string> = {
  sm: "h-9 px-5 text-sm",
  md: "h-11 px-6 text-[0.95rem]",
  lg: "h-14 px-8 text-base",
}

type CommonProps = {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  external,
  ...props
}: CommonProps &
  ({ href?: string; external?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement>)) {
  const classes = cn(base, variants[variant], sizes[size], className)

  if (href && external) {
    return (
      <a
        href={href}
        className={classes}
        rel="noopener noreferrer"
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {props.children}
      </a>
    )
  }
  if (href) {
    return (
      <LocalizedClientLink href={href} className={classes}>
        {props.children}
      </LocalizedClientLink>
    )
  }
  return (
    <button
      className={classes}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {props.children}
    </button>
  )
}
