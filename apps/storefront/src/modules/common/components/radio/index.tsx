const Radio = ({
  checked,
  "data-testid": dataTestId,
}: {
  checked: boolean
  "data-testid"?: string
}) => {
  return (
    <>
      <button
        type="button"
        role="radio"
        aria-checked="true"
        data-state={checked ? "checked" : "unchecked"}
        className="group relative flex h-5 w-5 items-center justify-center outline-none"
        data-testid={dataTestId || "radio-button"}
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full border bg-white transition-all group-hover:border-evergreen-400 group-data-[state=checked]:border-evergreen-600 group-data-[state=checked]:bg-evergreen-600 border-line-strong">
          {checked && (
            <span
              data-state={checked ? "checked" : "unchecked"}
              className="group flex items-center justify-center"
            >
              <div className="h-2 w-2 rounded-full bg-white"></div>
            </span>
          )}
        </div>
      </button>
    </>
  )
}

export default Radio
