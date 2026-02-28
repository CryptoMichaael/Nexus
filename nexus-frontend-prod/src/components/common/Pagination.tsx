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
      <button onClick={onLoadMore} disabled={isLoading} className="defi-btn">
        {isLoading ? 'Loading…' : 'Load more'}
      </button>
    </div>
  )
}
