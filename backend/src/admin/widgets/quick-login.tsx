import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button } from "@medusajs/ui"

/**
 * Dev-only "Quick login" button on the admin login screen. Pre-fills the local
 * owner email into the real form so local development is faster. Renders ONLY on
 * localhost — it returns null on any other host, so it never ships to production.
 *
 * No password is baked in: this file is part of the compiled admin bundle, so a
 * hardcoded value would leak into it (and into source). The button fills the
 * email and focuses the password field for you to type — set whatever password
 * you gave the admin user when you created it locally.
 */
const DEV_EMAIL = "owner@saludlinkusa.com"

// React tracks input values internally; set via the native setter + fire an input event
// so React's state updates before the form submits.
function setReactInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

const QuickLogin = () => {
  const isLocal =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)

  if (!isLocal) return null

  const doLogin = () => {
    const email = document.querySelector<HTMLInputElement>(
      'input[type="email"], input[name="email"]'
    )
    const password = document.querySelector<HTMLInputElement>(
      'input[type="password"], input[name="password"]'
    )
    if (email) setReactInputValue(email, DEV_EMAIL)
    // Focus the password field so you can type your local password and submit.
    password?.focus()
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <Button variant="secondary" size="small" onClick={doLogin} type="button">
        ⚡ Fill dev email
      </Button>
      <span className="text-ui-fg-subtle text-xs">
        {DEV_EMAIL} (local only)
      </span>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "login.after",
})

export default QuickLogin
