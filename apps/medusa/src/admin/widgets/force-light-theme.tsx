import { defineWidgetConfig } from "@medusajs/admin-sdk"

/**
 * Saludlink admin branding + light theme, injected on the login screen (before the
 * authenticated app initializes). Sets the "Saludlink Manage" wordmark above the login
 * form, pins the theme to light (Medusa stores it per-browser in localStorage), and sets
 * the browser tab title.
 */
const SaludlinkAdminBranding = () => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("medusa_admin_theme", "light")
      document.documentElement.classList.remove("dark")
      document.documentElement.classList.add("light")
      document.title = "Saludlink Manage"
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#2e5540" />
          <path
            d="M18.5 16.5a6 6 0 0 0 0 12h4"
            stroke="#fbf8f3"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M29.5 31.5a6 6 0 0 0 0-12h-4"
            stroke="#c56b4e"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M24 12.5c2.6 0 4.7 1.9 4.7 4.4-2.6 0-4.7-1.9-4.7-4.4Z"
            fill="#8fb29a"
          />
        </svg>
        <span
          style={{ fontWeight: 600, fontSize: "1.25rem", color: "#1a3227" }}
        >
          Saludlink Manage
        </span>
      </div>
      <span style={{ fontSize: "0.8rem", color: "#5a625b" }}>
        Commerce, content &amp; policies
      </span>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default SaludlinkAdminBranding
