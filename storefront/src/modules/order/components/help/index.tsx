import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div className="mt-2 border-t border-line pt-6">
      <Heading className="font-display text-lg text-evergreen-800">
        Need help?
      </Heading>
      <div className="my-2">
        <ul className="flex flex-col gap-y-2">
          <li>
            <LocalizedClientLink
              href="/contact"
              className="text-sm font-medium text-evergreen-700 hover:underline underline-offset-2"
            >
              Contact
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink
              href="/contact"
              className="text-sm font-medium text-evergreen-700 hover:underline underline-offset-2"
            >
              Returns & Exchanges
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
