import Spinner from "@modules/common/icons/spinner"

export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full text-ink-muted">
      <Spinner size={36} />
    </div>
  )
}
