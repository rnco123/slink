import { stateAvailability } from "@lib/config/availability"

type Labels = {
  state: string
  telehealth: string
  shipping: string
  available: string
  notYet: string
}

const defaultLabels: Labels = {
  state: "State",
  telehealth: "Telehealth",
  shipping: "Product shipping",
  available: "Available",
  notYet: "Not yet",
}

/**
 * State-availability disclosure (LegitScript Standard 5). Renders the states where
 * telehealth and/or shipping are available. Reused by /telemedicine and /licensing.
 * Labels are passed in (dict-driven) so the table is bilingual.
 */
export function StateAvailabilityTable({
  filter = "all",
  labels = defaultLabels,
}: {
  filter?: "all" | "telehealth" | "shipping"
  labels?: Labels
}) {
  const rows =
    filter === "telehealth"
      ? stateAvailability.filter((s) => s.telehealth)
      : filter === "shipping"
      ? stateAvailability.filter((s) => s.shipping)
      : stateAvailability

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-sand-50 text-ink-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{labels.state}</th>
            <th className="px-4 py-3 font-medium">{labels.telehealth}</th>
            <th className="px-4 py-3 font-medium">{labels.shipping}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.code} className="border-t border-line">
              <td className="px-4 py-3 text-ink">{s.name}</td>
              <td className="px-4 py-3">
                {s.telehealth ? (
                  <span className="text-evergreen-600">{labels.available}</span>
                ) : (
                  <span className="text-ink-subtle">{labels.notYet}</span>
                )}
              </td>
              <td className="px-4 py-3">
                {s.shipping ? (
                  <span className="text-evergreen-600">{labels.available}</span>
                ) : (
                  <span className="text-ink-subtle">{labels.notYet}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
