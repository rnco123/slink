/**
 * Renders a JSON-LD structured-data script tag. Server-safe; drop it anywhere
 * in a Server Component tree:
 *
 *   import { JsonLd } from "@lib/seo/JsonLd"
 *   import { productJsonLd } from "@lib/seo/jsonld"
 *
 *   <JsonLd data={productJsonLd({ ... })} />
 *
 * Accepts a single object or an array of nodes (rendered as one script each).
 */
import * as React from "react"

type JsonLdData = Record<string, any>

export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const nodes = Array.isArray(data) ? data : [data]
  return (
    <>
      {nodes.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is safe to inject here; there is no
          // user-controlled HTML. We still escape "<" defensively to avoid
          // any "</script>" breakout in string fields.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  )
}

export default JsonLd
