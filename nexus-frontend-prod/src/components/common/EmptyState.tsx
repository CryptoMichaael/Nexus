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
    <div className="defi-card p-8 text-center">
      <div className="text-4xl mb-3 drop-shadow-[0_0_18px_rgba(244,197,66,0.18)]">{icon}</div>
      <div className="text-lg font-semibold text-slate-100">{title}</div>
      <div className="text-sm text-slate-400 mt-1">{description}</div>
    </div>
  )
}
