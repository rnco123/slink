import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PencilSquare } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Badge,
  Input,
  Textarea,
  Select,
  Label,
  Text,
  toast,
  FocusModal,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

type Article = {
  id: string
  slug: string
  locale: string
  title: string
  excerpt?: string | null
  body: string
  category?: string | null
  author_name?: string | null
  reviewer_name?: string | null
  reviewer_credentials?: string | null
  reviewed_at?: string | null
  status: string
  published_at?: string | null
}

const empty: Partial<Article> = {
  slug: "",
  locale: "en",
  title: "",
  excerpt: "",
  body: "",
  category: "metabolic-health",
  author_name: "Saludlink Editorial",
  status: "draft",
}

const ArticlesAdminPage = () => {
  const [items, setItems] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Article> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/content/articles", {
        credentials: "include",
      })
      const data = await res.json()
      setItems(data.articles || [])
    } catch {
      toast.error("Failed to load articles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const isNew = !editing.id
      const url = isNew
        ? "/admin/content/articles"
        : `/admin/content/articles/${editing.id}`
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      })
      if (!res.ok) throw new Error()
      toast.success(isNew ? "Article created" : "Article saved")
      setEditing(null)
      load()
    } catch {
      toast.error("Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Blog &amp; Health Articles</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Medically-reviewed health content (English &amp; Spanish).
          </Text>
        </div>
        <Button variant="secondary" onClick={() => setEditing({ ...empty })}>
          New article
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : items.length === 0 ? (
          <Text className="text-ui-fg-subtle">No articles yet.</Text>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge size="2xsmall">{a.locale.toUpperCase()}</Badge>
                  <span className="font-medium">{a.title}</span>
                  <span className="text-ui-fg-subtle text-sm">/{a.slug}</span>
                  <Badge
                    size="2xsmall"
                    color={a.status === "published" ? "green" : "grey"}
                  >
                    {a.status}
                  </Badge>
                </div>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setEditing(a)}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FocusModal open onOpenChange={(o) => !o && setEditing(null)}>
          <FocusModal.Content>
            <FocusModal.Header>
              <Button size="small" onClick={save} isLoading={saving}>
                Save
              </Button>
            </FocusModal.Header>
            <FocusModal.Body className="flex flex-col gap-4 overflow-y-auto p-6">
              <Heading level="h2">
                {editing.id ? "Edit article" : "New article"}
              </Heading>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, slug: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Language</Label>
                  <Select
                    value={editing.locale}
                    onValueChange={(v) => setEditing({ ...editing, locale: v })}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="en">English</Select.Item>
                      <Select.Item value="es">Español</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Status</Label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="published">Published</Select.Item>
                      <Select.Item value="draft">Draft</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Title</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Excerpt</Label>
                <Input
                  value={editing.excerpt || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, excerpt: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Author</Label>
                  <Input
                    value={editing.author_name || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, author_name: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Medically reviewed by</Label>
                  <Input
                    value={editing.reviewer_name || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, reviewer_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Body (Markdown)</Label>
                <Textarea
                  rows={14}
                  value={editing.body || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, body: e.target.value })
                  }
                />
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Blog & Articles",
  icon: PencilSquare,
})

export default ArticlesAdminPage
