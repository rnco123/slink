import { defineRouteConfig } from "@medusajs/admin-sdk"
import { StarSolid } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Badge,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

type Review = {
  id: string
  product_id: string
  display_name: string
  rating: number
  title?: string | null
  content: string
  verified_purchase: boolean
  status: string
  created_at?: string
}

const STATUS_COLOR: Record<string, "green" | "red" | "orange" | "grey"> = {
  approved: "green",
  rejected: "red",
  pending: "orange",
}

const Stars = ({ n }: { n: number }) => (
  <span aria-label={`${n} out of 5 stars`} className="text-ui-tag-orange-text">
    {"★".repeat(n)}
    <span className="text-ui-fg-muted">{"★".repeat(5 - n)}</span>
  </span>
)

const ProductReviewsAdminPage = () => {
  const [items, setItems] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("pending")
  const [busy, setBusy] = useState<string | null>(null)

  const load = async (s: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/product-reviews?status=${s}`, {
        credentials: "include",
      })
      const data = await res.json()
      setItems(data.reviews || [])
    } catch {
      toast.error("Failed to load reviews")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(status)
  }, [status])

  const moderate = async (id: string, next: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/admin/product-reviews/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Review ${next}`)
      load(status)
    } catch {
      toast.error("Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Product Reviews</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Moderate customer reviews. Only <strong>approved</strong> reviews
            appear on the storefront — approve nothing that makes a medical or
            disease-treatment claim (LegitScript/FTC).
          </Text>
        </div>
        <div className="w-40">
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="approved">Approved</Select.Item>
              <Select.Item value="rejected">Rejected</Select.Item>
              <Select.Item value="all">All</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : items.length === 0 ? (
          <Text className="text-ui-fg-subtle">No {status} reviews.</Text>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((r) => (
              <div key={r.id} className="rounded-lg border px-4 py-3">
                <div className="mb-1 flex items-center gap-3">
                  <Stars n={r.rating} />
                  <span className="font-medium">{r.title || "(no title)"}</span>
                  <Badge
                    size="2xsmall"
                    color={STATUS_COLOR[r.status] || "grey"}
                  >
                    {r.status}
                  </Badge>
                  {r.verified_purchase && (
                    <Badge size="2xsmall" color="blue">
                      Verified purchase
                    </Badge>
                  )}
                </div>
                <Text size="small" className="text-ui-fg-subtle mb-1">
                  {r.display_name} · product {r.product_id}
                </Text>
                <Text size="small" className="mb-3 whitespace-pre-wrap">
                  {r.content}
                </Text>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="primary"
                    isLoading={busy === r.id}
                    disabled={r.status === "approved"}
                    onClick={() => moderate(r.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    isLoading={busy === r.id}
                    disabled={r.status === "rejected"}
                    onClick={() => moderate(r.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Product Reviews",
  icon: StarSolid,
})

export default ProductReviewsAdminPage
