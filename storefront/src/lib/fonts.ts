/**
 * Self-hosted fonts (T8, performance). next/font downloads + subsets at build time —
 * zero external font requests at runtime (better LCP + no Google Fonts data-flow concerns).
 * Fraunces = editorial serif display; Inter = body; IBM Plex Mono = data accents.
 * Exposed as CSS variables consumed by tokens.css / Tailwind.
 */
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google"

export const fontDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
})

export const fontBody = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
})

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
})

export const fontVariables = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
