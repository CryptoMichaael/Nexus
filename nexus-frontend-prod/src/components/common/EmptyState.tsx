export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1">{description}</div>
    </div>
  )
}
