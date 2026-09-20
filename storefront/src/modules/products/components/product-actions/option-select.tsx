import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-medium text-ink">
        {title}
        {current && <span className="ml-1 text-ink-muted">· {current}</span>}
      </span>
      <div className="flex flex-wrap gap-2" data-testid={dataTestId}>
        {filteredOptions.map((v) => {
          const selected = v === current
          return (
            <button
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                "min-w-[3rem] rounded-pill border px-4 py-2.5 text-sm font-medium transition-all duration-150",
                selected
                  ? "border-evergreen-600 bg-evergreen-50 text-evergreen-800 ring-1 ring-evergreen-600"
                  : "border-line-strong bg-white text-ink hover:border-evergreen-400 hover:bg-sand-50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              disabled={disabled}
              data-testid="option-button"
              aria-pressed={selected}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
