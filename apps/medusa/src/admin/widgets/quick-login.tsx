import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button } from "@medusajs/ui"

/**
 * Dev-only "Quick login" button on the admin login screen. Fills the seeded owner
 * credentials into the real form and submits, so local development is one click. Renders
 * ONLY on localhost — it returns null on any other host, so it never ships to production.
 */
const DEV_EMAIL = "owner@saludlinkusa.com"
const DEV_PASSWORD = "Saludlink#2026"

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
    if (password) setReactInputValue(password, DEV_PASSWORD)

    // Let React flush, then submit the form.
    setTimeout(() => {
      const form = password?.closest("form") || email?.closest("form")
      const submit =
        form?.querySelector<HTMLButtonElement>('button[type="submit"]') ||
        Array.from(document.querySelectorAll("button")).find((b) =>
          /continue|sign in|log ?in/i.test(b.textContent || "")
        )
      submit?.click()
    }, 120)
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <Button variant="secondary" size="small" onClick={doLogin} type="button">
        ⚡ Dev quick login
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
