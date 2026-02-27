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
    <div className="bg-white rounded-lg border border-red-200 p-6">
      <div className="text-red-600 font-semibold mb-1">{title}</div>
      <div className="text-sm text-slate-600 mb-4">{message}</div>
      {onRetry ? (
        <button
          className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
