import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"

/**
 * Branded welcome panel on the admin landing page.
 *
 * Medusa v2 has no dedicated dashboard home — `/app` lands on the Orders list — so
 * this injects into `order.list.before`, giving the operator a Saludlink-branded
 * header instead of the bare Medusa table, plus a live count of reviews waiting on
 * moderation and quick links to the custom admin sections (content, articles,
 * reviews, settings) that would otherwise be buried in the sidebar.
 *
 * Uses @medusajs/ui primitives + the admin CSS-var tokens so it inherits the
 * dashboard's spacing/typography exactly. Navigation is plain anchors to /app/*
 * — no admin route in this project uses react-router's navigate, so anchors are
 * the safe, dependency-free choice (a same-app href just re-runs the SPA route).
 */

type QuickLink = {
  href: string
  label: string
  description: string
}

const LINKS: QuickLink[] = [
  {
    href: "/app/product-reviews",
    label: "Product Reviews",
    description: "Approve or reject customer reviews",
  },
  {
    href: "/app/content",
    label: "Content & Policies",
    description: "Edit legal and marketing pages",
  },
  {
    href: "/app/articles",
    label: "Blog & Articles",
    description: "Publish health-education posts",
  },
  {
    href: "/app/site-settings",
    label: "Site Settings",
    description: "Contact details and store info",
  },
]

const DashboardWelcome = () => {
  const [pendingReviews, setPendingReviews] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    // Best-effort: a failure here must never blank the landing page, so the
    // badge simply stays hidden if the count can't be read.
    fetch("/admin/product-reviews?status=pending&limit=1", {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && typeof data.count === "number") {
          setPendingReviews(data.count)
        }
      })
      .catch(() => {
        /* ignore — leave the badge hidden */
      })
    return () => {
      alive = false
    }
  }, [])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <Container className="mb-4 p-0 overflow-hidden">
      {/* Evergreen brand header band */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ background: "#2e5540" }}
      >
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#26482f" />
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
        <div className="flex flex-col">
          <Heading level="h2" style={{ color: "#fbf8f3" }}>
            {greeting} — Saludlink Manage
          </Heading>
          <Text size="small" style={{ color: "#c7d3ca" }}>
            Commerce, content &amp; policies in one place
          </Text>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-px bg-ui-border-base sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((link) => {
          const showBadge =
            link.href === "/app/product-reviews" &&
            pendingReviews !== null &&
            pendingReviews > 0
          return (
            <a
              key={link.href}
              href={link.href}
              className="group flex flex-col gap-1 bg-ui-bg-base p-5 transition-colors hover:bg-ui-bg-base-hover"
            >
              <div className="flex items-center justify-between gap-2">
                <Text
                  weight="plus"
                  className="text-ui-fg-base group-hover:text-ui-fg-interactive"
                >
                  {link.label}
                </Text>
                {showBadge ? (
                  <Badge size="2xsmall" color="orange" rounded="full">
                    {pendingReviews}
                  </Badge>
                ) : null}
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {link.description}
              </Text>
            </a>
          )
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default DashboardWelcome
