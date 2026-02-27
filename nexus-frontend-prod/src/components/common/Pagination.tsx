export function Pagination({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}) {
  if (!hasMore) return null

  return (
    <div className="flex justify-center pt-4">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading…' : 'Load more'}
      </button>
    </div>
  )
}
