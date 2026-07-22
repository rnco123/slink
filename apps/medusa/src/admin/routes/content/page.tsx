import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
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

type ContentPage = {
  id: string
  slug: string
  locale: string
  type: string
  title: string
  body: string
  status: string
  last_updated?: string | null
}

const empty: Partial<ContentPage> = {
  slug: "",
  locale: "en",
  type: "legal",
  title: "",
  body: "",
  status: "published",
}

const ContentAdminPage = () => {
  const [pages, setPages] = useState<ContentPage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<ContentPage> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/content/pages", {
        credentials: "include",
      })
      const data = await res.json()
      setPages(data.pages || [])
    } catch {
      toast.error("Failed to load content pages")
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
        ? "/admin/content/pages"
        : `/admin/content/pages/${editing.id}`
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      })
      if (!res.ok) throw new Error()
      toast.success(isNew ? "Page created" : "Page saved")
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
          <Heading level="h2">Content &amp; Policies</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Edit legal/policy and marketing pages (English &amp; Spanish). The
            storefront reads published pages.
          </Text>
        </div>
        <Button variant="secondary" onClick={() => setEditing({ ...empty })}>
          New page
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : pages.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No pages yet. Run the content seed or create one.
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {pages.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge size="2xsmall">{p.locale.toUpperCase()}</Badge>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-ui-fg-subtle text-sm">/{p.slug}</span>
                  <Badge
                    size="2xsmall"
                    color={p.status === "published" ? "green" : "grey"}
                  >
                    {p.status}
                  </Badge>
                </div>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setEditing(p)}
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
                {editing.id ? "Edit page" : "New page"}
              </Heading>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, slug: e.target.value })
                    }
                    placeholder="privacy-policy"
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex flex-col gap-1">
                  <Label>Last updated (display)</Label>
                  <Input
                    value={editing.last_updated || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, last_updated: e.target.value })
                    }
                    placeholder="2026-07-22"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Body (Markdown)</Label>
                <Textarea
                  rows={16}
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
  label: "Content & Policies",
  icon: DocumentText,
})

export default ContentAdminPage
