function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

export function Badge({
  label,
  variant = 'default',
}: {
  label: string
  variant?: BadgeVariant
}) {
  const styles: Record<BadgeVariant, string> = {
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={cx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border',
        styles[variant]
      )}
    >
      {label}
    </span>
  )
}
