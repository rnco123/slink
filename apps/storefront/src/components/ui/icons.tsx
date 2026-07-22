import * as React from "react"

/**
 * Saludlink line-icon set for condition verticals + features. 1.6px stroke, currentColor,
 * so they inherit brand color from the parent. Editorial, consistent, self-contained (no
 * icon-font or external asset). Keyed by condition slug in ConditionIcon.
 */
type IconProps = React.SVGProps<SVGSVGElement>

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function IconWeight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 8h14l-1.8 11.5a1 1 0 0 1-1 .8H7.8a1 1 0 0 1-1-.8L5 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M12 12.5v3.5M10.3 14.2 12 12.5l1.7 1.7" />
    </svg>
  )
}

export function IconMetabolic(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  )
}

export function IconNutrition(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13a8 8 0 0 0 16 0H4Z" />
      <path d="M12 5c-1.6 1.2-2 3-1 4.5M12 5c1.6 1.2 2 3 1 4.5" />
      <path d="M6.5 20h11" />
    </svg>
  )
}

export function IconMonitoring(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 13h4l2-4 2 7 2-5 1.5 2H21" />
    </svg>
  )
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v5c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function IconTruck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="17.5" cy="17" r="1.6" />
    </svg>
  )
}

const CONDITION_ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  "weight-management": IconWeight,
  "metabolic-health": IconMetabolic,
  nutrition: IconNutrition,
  monitoring: IconMonitoring,
}

export function ConditionIcon({
  slug,
  ...props
}: { slug: string } & IconProps) {
  const Cmp = CONDITION_ICONS[slug] ?? IconMetabolic
  return <Cmp {...props} />
}
