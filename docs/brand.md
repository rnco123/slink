# Saludlink — Brand Sheet (T1)

Design direction: **editorial / premium wellness**. The strategic bet: every generic telehealth site uses clinical blue/teal on white. Saludlink deliberately owns a **warmer, editorial** space — deep evergreen + warm cream + a clay accent — so it reads like a premium health publication that happens to sell products and offer care, not a sterile clinic portal.

Name: **Saludlink** ("salud" = health, "link" = connection) · domain **saludlinkusa.com** · lead vertical **weight & metabolic health**.

---

## Color

| Role | Token | Hex |
|---|---|---|
| Primary brand | `evergreen-600` | `#2e5540` |
| Primary deep (text on cream, headers) | `evergreen-800/900` | `#1a3227` / `#12241c` |
| Page background | `cream` | `#fbf8f3` |
| Warm neutral surfaces/lines | `sand-*` | `#f7f2ea` … `#6f6249` |
| **Accent / CTA** | `clay-500` | `#c56b4e` |
| Trust flourish (badges, seals) | `gold-500` | `#c99a4e` |
| Ink (body text) | `ink` | `#1b211d` |
| Muted text | `ink-muted` | `#5a625b` |

Semantic: success `#3d6b50` · warning `#b8862f` · error `#a83a2b` · info `#35617d`.

**Usage rules:** evergreen carries brand + primary UI; clay is reserved for primary CTAs and key highlights (use sparingly so it stays a signal, not noise); gold only for trust/certification marks; cream is the default canvas — pure white is for raised surfaces (cards, buy box).

## Typography

- **Display — Fraunces** (variable serif, optical sizing): all headings, hero statements, editorial pull quotes. Warm, high-craft, softens the clinical category. Self-hosted via `next/font/google`.
- **Body — Inter**: UI, paragraphs, labels, data. Neutral, hyper-legible, pairs cleanly under Fraunces.
- **Mono — IBM Plex Mono**: data accents (biomarker values, order numbers, code-like precision moments).

Fluid scale via `clamp()` (tokens `--sl-text-xs` … `--sl-text-5xl`). Editorial reading width capped at `--sl-container-narrow` (760px) for articles/legal.

## Shape, depth, motion

- **Radius:** soft but not bubbly — `0.625rem` base, `1rem` cards, pill for tags/badges.
- **Shadows:** warm-tinted, subtle (`--sl-shadow*`); premium restraint, no heavy drop shadows.
- **Motion:** `cubic-bezier(0.22, 1, 0.36, 1)` ("editorial" ease), 150–420ms; honors `prefers-reduced-motion`. Scroll reveals are gentle fades/rises, never bouncy.

## Voice

Warm, credible, plain-spoken. Confident without hype. **No unsupported health claims** — every product/benefit statement must be FDA/FTC-supportable (see [legitweb-rules.md](legitweb-rules.md)). Bilingual EN/ES-friendly (the name invites it; a future SEO edge).

## Where it lives in code

- Tokens: `packages/ui/src/styles/tokens.css` (CSS variables — one source of truth)
- Tailwind mapping: `packages/ui/tailwind-preset.cjs`
- Typed tokens (OG images, emails): `packages/ui/src/tokens/index.ts`
- React components: `apps/storefront/src/components/ui/*` (kept in the app for React 19)
