/**
 * State availability (LegitScript Standard 5 — services must disclose where they are
 * available). This list is the source of truth for the telemedicine + licensing pages and
 * later for state-gated product shipping. REPLACE the placeholder set with the real,
 * legally-confirmed list of states where Saludlink telehealth is licensed to operate.
 */
export type StateAvailability = {
  code: string
  name: string
  telehealth: boolean
  shipping: boolean
}

// TODO: confirm the real licensed-state list with compliance before launch.
export const stateAvailability: StateAvailability[] = [
  { code: "AZ", name: "Arizona", telehealth: true, shipping: true },
  { code: "CA", name: "California", telehealth: true, shipping: true },
  { code: "FL", name: "Florida", telehealth: true, shipping: true },
  { code: "GA", name: "Georgia", telehealth: true, shipping: true },
  { code: "IL", name: "Illinois", telehealth: true, shipping: true },
  { code: "NC", name: "North Carolina", telehealth: true, shipping: true },
  { code: "NY", name: "New York", telehealth: false, shipping: true },
  { code: "TX", name: "Texas", telehealth: true, shipping: true },
  { code: "WA", name: "Washington", telehealth: true, shipping: true },
]

export const telehealthStates = stateAvailability.filter((s) => s.telehealth)
export const shippingStates = stateAvailability.filter((s) => s.shipping)
