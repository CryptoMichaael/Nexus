export function KpiCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string
  value: number
  icon: string
  loading?: boolean
}) {
  return (
    <div className="defi-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="text-2xl font-semibold text-slate-100 mt-1">
            {loading ? '—' : new Intl.NumberFormat('en-US').format(value)}
          </div>
        </div>
        <div className="text-3xl drop-shadow-[0_0_18px_rgba(244,197,66,0.18)]">{icon}</div>
      </div>
    </div>
  )
}
