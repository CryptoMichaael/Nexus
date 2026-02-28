export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="defi-card p-6 border-red-500/20">
      <div className="text-red-200 font-semibold mb-1">{title}</div>
      <div className="text-sm text-slate-300 mb-4">{message}</div>
      {onRetry ? (
        <button className="defi-btn" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
