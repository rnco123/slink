import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { headers } from "next/headers"
import { fontVariables } from "@lib/fonts"
// Design tokens first so their CSS custom properties are defined before globals/Tailwind
// consume them. Imported via JS (not a CSS @import) so Next resolves the package `exports`
// map and inlines it — a bare CSS @import of a package specifier can't resolve in the browser.
import "@saludlink/ui/tokens.css"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Saludlink — Metabolic Health, Thoughtfully Delivered",
    template: "%s | Saludlink",
  },
  description:
    "Saludlink pairs clinician-informed weight & metabolic health products with connected telehealth care. Evidence-based, transparently priced, shipped to your door.",
  applicationName: "Saludlink",
  authors: [{ name: "Saludlink" }],
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: "#2e5540",
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const lang = (await headers()).get("x-locale") === "es" ? "es" : "en"
  return (
    <html lang={lang} data-mode="light" className={fontVariables}>
      <body className="bg-cream font-body text-ink antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
