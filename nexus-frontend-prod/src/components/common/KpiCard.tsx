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
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-2xl font-semibold text-slate-900 mt-1">
            {loading ? '—' : new Intl.NumberFormat('en-US').format(value)}
          </div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}
