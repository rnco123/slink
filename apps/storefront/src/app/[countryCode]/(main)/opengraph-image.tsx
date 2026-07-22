import { ImageResponse } from "next/og"
import { brand, colors } from "@saludlink/ui"

/**
 * Default dynamic OpenGraph image for the (main) route group. Any page under
 * `/[countryCode]/(main)` that doesn't define its own `opengraph-image` inherits
 * this one. 1200x630, evergreen background with cream wordmark + tagline.
 *
 * Note: Satori (next/og) requires every element with multiple children to have
 * an explicit `display: flex`. We use the system default sans font (no external
 * font fetch) to stay fully self-contained.
 */
export const alt = `${brand.name} — ${brand.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  const evergreen = colors.evergreen[600]
  const evergreenDeep = colors.evergreen[800]
  const cream = colors.cream
  const gold = colors.gold[300]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          backgroundColor: evergreen,
          backgroundImage: `radial-gradient(circle at 78% 18%, ${evergreenDeep}00 0%, ${evergreenDeep} 78%)`,
          color: cream,
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: brandmark dot + eyebrow */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 22,
              backgroundColor: gold,
              marginRight: 18,
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: colors.evergreen[100],
            }}
          >
            {brand.domain}
          </div>
        </div>

        {/* Center: wordmark + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 132,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            {brand.name}
          </div>
          <div
            style={{
              display: "flex",
              width: 96,
              height: 8,
              borderRadius: 8,
              backgroundColor: gold,
              margin: "34px 0",
            }}
          />
          <div
            style={{
              fontSize: 46,
              lineHeight: 1.2,
              color: colors.evergreen[100],
              maxWidth: 820,
            }}
          >
            {brand.tagline}
          </div>
        </div>

        {/* Bottom: category line */}
        <div
          style={{
            fontSize: 28,
            color: colors.evergreen[200],
          }}
        >
          Weight &amp; metabolic health · Connected telehealth care
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
