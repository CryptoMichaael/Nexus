export function Skeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="h-10 bg-slate-200 rounded" />
      <div className="h-10 bg-slate-200 rounded" />
      <div className="h-10 bg-slate-200 rounded" />
    </div>
  )
}
