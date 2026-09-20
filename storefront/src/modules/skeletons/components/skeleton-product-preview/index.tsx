const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse">
      <div className="aspect-square w-full rounded-lg border border-line bg-sand-100" />
      <div className="mt-3 flex justify-between gap-3">
        <div className="h-4 w-2/5 rounded bg-sand-100" />
        <div className="h-4 w-1/5 rounded bg-sand-100" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
