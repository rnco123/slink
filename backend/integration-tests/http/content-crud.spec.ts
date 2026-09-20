import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminUser, createPublishableKey } from "../helpers/auth"

jest.setTimeout(5 * 60 * 1000)

/**
 * Content mini-CMS — admin CRUD + store read filtering (roadmap task 24).
 *
 * Exercises the real HTTP routes against a throwaway DB:
 *   - admin create/read/update/delete for pages & articles (auth-gated)
 *   - upsert semantics for singleton site settings
 *   - the store read path only ever returns PUBLISHED rows, honours locale/type
 *     filters, and shapes settings as a { key: value } map
 *
 * The store contract is the one the storefront + sitemap depend on (task 22), so
 * the draft-invisibility and locale-scoping assertions are the load-bearing ones.
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: Awaited<ReturnType<typeof createAdminUser>>
    let store: Awaited<ReturnType<typeof createPublishableKey>>["store"]

    beforeEach(async () => {
      const container = getContainer()
      admin = await createAdminUser(container)
      store = (await createPublishableKey(container)).store
    })

    describe("Admin content pages CRUD", () => {
      it("creates, reads, updates and deletes a page", async () => {
        // CREATE
        const created = await api.post(
          "/admin/content/pages",
          {
            slug: "privacy-policy",
            locale: "en",
            type: "legal",
            title: "Privacy Policy",
            body: "# Privacy\nWe respect your data.",
            status: "published",
            last_updated: "2026-07-23",
          },
          admin.headers
        )
        expect(created.status).toEqual(201)
        expect(created.data.page).toMatchObject({
          slug: "privacy-policy",
          locale: "en",
          status: "published",
        })
        const id: string = created.data.page.id
        expect(id).toBeTruthy()

        // READ (single)
        const read = await api.get(`/admin/content/pages/${id}`, admin.headers)
        expect(read.status).toEqual(200)
        expect(read.data.page.title).toEqual("Privacy Policy")

        // LIST
        const list = await api.get("/admin/content/pages", admin.headers)
        expect(list.status).toEqual(200)
        expect(list.data.pages.map((p: { id: string }) => p.id)).toContain(id)

        // UPDATE
        const updated = await api.post(
          `/admin/content/pages/${id}`,
          { title: "Privacy Policy (Updated)", status: "draft" },
          admin.headers
        )
        expect(updated.status).toEqual(200)
        const updatedRead = await api.get(
          `/admin/content/pages/${id}`,
          admin.headers
        )
        expect(updatedRead.data.page.title).toEqual("Privacy Policy (Updated)")
        expect(updatedRead.data.page.status).toEqual("draft")

        // DELETE
        const deleted = await api.delete(
          `/admin/content/pages/${id}`,
          admin.headers
        )
        expect(deleted.status).toEqual(200)
        expect(deleted.data).toMatchObject({ id, deleted: true })
      })

      it("rejects an unauthenticated admin request", async () => {
        const res = await api
          .get("/admin/content/pages")
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toEqual(401)
      })
    })

    describe("Store content pages read path", () => {
      beforeEach(async () => {
        // A published EN legal page, a Spanish sibling, and an unpublished draft.
        await api.post(
          "/admin/content/pages",
          {
            slug: "terms",
            locale: "en",
            type: "legal",
            title: "Terms of Service",
            body: "Terms EN",
            status: "published",
          },
          admin.headers
        )
        await api.post(
          "/admin/content/pages",
          {
            slug: "terms",
            locale: "es",
            type: "legal",
            title: "Términos del Servicio",
            body: "Terms ES",
            status: "published",
          },
          admin.headers
        )
        await api.post(
          "/admin/content/pages",
          {
            slug: "draft-page",
            locale: "en",
            type: "page",
            title: "Draft Page",
            body: "hidden",
            status: "draft",
          },
          admin.headers
        )
      })

      it("returns only published pages for the requested locale", async () => {
        const en = await api.get("/store/content/pages?locale=en", store)
        expect(en.status).toEqual(200)
        const slugs = en.data.pages.map((p: { slug: string }) => p.slug)
        expect(slugs).toContain("terms")
        // Draft never leaks to the storefront.
        expect(slugs).not.toContain("draft-page")
        // Spanish sibling is excluded from the EN response.
        expect(
          en.data.pages.every((p: { locale: string }) => p.locale === "en")
        ).toBe(true)
      })

      it("scopes results by locale", async () => {
        const es = await api.get("/store/content/pages?locale=es", store)
        const es_terms = es.data.pages.find(
          (p: { slug: string }) => p.slug === "terms"
        )
        expect(es_terms).toBeTruthy()
        expect(es_terms.title).toEqual("Términos del Servicio")
      })

      it("filters by type when provided", async () => {
        const legal = await api.get(
          "/store/content/pages?locale=en&type=legal",
          store
        )
        expect(
          legal.data.pages.every((p: { type: string }) => p.type === "legal")
        ).toBe(true)
        expect(legal.data.pages.length).toBeGreaterThan(0)
      })

      it("serves a single published page by slug, 404s a draft", async () => {
        const ok = await api.get("/store/content/pages/terms?locale=en", store)
        expect(ok.status).toEqual(200)
        expect(ok.data.page.slug).toEqual("terms")

        const missing = await api
          .get("/store/content/pages/draft-page?locale=en", store)
          .catch((e: { response: { status: number } }) => e.response)
        expect(missing.status).toEqual(404)
      })
    })

    describe("Articles", () => {
      it("creates via admin and exposes only published ones to the store", async () => {
        await api.post(
          "/admin/content/articles",
          {
            slug: "ozempic-guide",
            locale: "en",
            title: "GLP-1 Guide",
            body: "content",
            status: "published",
            published_at: "2026-07-01",
          },
          admin.headers
        )
        await api.post(
          "/admin/content/articles",
          {
            slug: "wip-article",
            locale: "en",
            title: "Work in progress",
            body: "content",
            status: "draft",
          },
          admin.headers
        )

        const storeRes = await api.get(
          "/store/content/articles?locale=en",
          store
        )
        expect(storeRes.status).toEqual(200)
        const slugs = storeRes.data.articles.map(
          (a: { slug: string }) => a.slug
        )
        expect(slugs).toContain("ozempic-guide")
        expect(slugs).not.toContain("wip-article")
      })
    })

    describe("Site settings upsert", () => {
      it("creates then updates a setting by key (singleton) and maps it for the store", async () => {
        const first = await api.post(
          "/admin/content/settings",
          {
            key: "contact",
            value: { email: "hi@saludlinkusa.com" },
            label: "Contact",
          },
          admin.headers
        )
        expect(first.status).toEqual(200)

        // Same key upserts in place rather than creating a duplicate.
        await api.post(
          "/admin/content/settings",
          { key: "contact", value: { email: "support@saludlinkusa.com" } },
          admin.headers
        )

        const adminList = await api.get(
          "/admin/content/settings",
          admin.headers
        )
        const contactRows = adminList.data.settings.filter(
          (s: { key: string }) => s.key === "contact"
        )
        expect(contactRows).toHaveLength(1)

        // Store exposes settings as a { key: value } map.
        const storeRes = await api.get("/store/content/settings", store)
        expect(storeRes.data.settings.contact).toMatchObject({
          email: "support@saludlinkusa.com",
        })
      })
    })
  },
})
