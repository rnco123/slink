import { HttpTypes } from "@medusajs/types"

/** Read a boolean-ish metadata field — Medusa can return a real boolean or a string. */
const metaBool = (
  metadata: HttpTypes.StoreProduct["metadata"],
  key: string
): boolean => {
  const value = (metadata ?? {})[key as keyof typeof metadata]
  return value === true || value === "true"
}

/**
 * "How your order works" — a 3-step explainer for prescription SKUs. It surfaces
 * the reassurance that's otherwise buried in the compliance paragraphs: a
 * licensed physician reviews every order, you're refunded if it isn't approved,
 * and it ships discreetly once cleared. Renders nothing for non-Rx products.
 */
export default function OrderSteps({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  if (!metaBool(product.metadata, "prescription_required")) return null

  const steps = [
    {
      icon: <ClipboardIcon />,
      title: "Order & health intake",
      body: "Choose your plan and complete a brief medical questionnaire about your health and goals.",
    },
    {
      icon: <ShieldCheckIcon />,
      title: "Physician review",
      body: "A licensed physician reviews your order — usually within 24 hours. If it isn't approved, you're refunded in full before anything ships.",
    },
    {
      icon: <TruckIcon />,
      title: "Discreet delivery",
      body: "Once approved, your kit ships 2-day or overnight with syringes, alcohol pads, and a video tutorial.",
    },
  ]

  return (
    <section
      aria-labelledby="how-heading"
      className="rounded-2xl border border-line bg-sand-50/60 p-6 sm:p-7"
    >
      <h2 id="how-heading" className="font-display text-xl text-evergreen-800">
        How your order works
      </h2>
      <ol className="mt-5 flex flex-col gap-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-4">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-evergreen-700 text-cream">
              {step.icon}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-clay-500 text-[11px] font-semibold text-cream">
                {i + 1}
              </span>
            </span>
            <div className="pt-0.5">
              <h3 className="text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* --- inline icons (18px, currentColor) --- */
const ClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect
      x="5"
      y="4"
      width="14"
      height="17"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ShieldCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="m9 12 2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3 7h11v9H3zM14 10h4l3 3v3h-7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)
