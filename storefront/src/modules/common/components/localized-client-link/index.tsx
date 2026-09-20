"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Use this component to create a Next.js `<Link />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
 */
const LocalizedClientLink = React.forwardRef<
  HTMLAnchorElement,
  {
    children?: React.ReactNode
    href: string
    className?: string
    onClick?: () => void
    passHref?: true
    [x: string]: any
  }
>(({ children, href, ...props }, ref) => {
  const { countryCode } = useParams()

  return (
    <Link ref={ref} href={`/${countryCode}${href}`} {...props}>
      {children}
    </Link>
  )
})

LocalizedClientLink.displayName = "LocalizedClientLink"

export default LocalizedClientLink
