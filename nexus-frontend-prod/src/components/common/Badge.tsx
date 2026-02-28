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
    success: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
    error: 'bg-red-500/10 text-red-200 border-red-500/20',
    info: 'bg-primary-600/10 text-primary-100 border-primary-500/20',
    default: 'bg-slate-500/10 text-slate-200 border-slate-500/20',
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
