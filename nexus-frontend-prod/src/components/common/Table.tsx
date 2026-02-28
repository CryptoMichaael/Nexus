import type { ReactNode } from 'react'

export type TableColumn<T> = {
  key: keyof T
  label: string
  width?: string
  render?: (value: unknown, row: T) => ReactNode
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
}: {
  columns: Array<TableColumn<T>>
  data: T[]
  keyField?: keyof T
}) {
  const resolvedKeyField = keyField || ('id' as keyof T)

  return (
    <div className="defi-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-black/30 border-b border-primary-500/15">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3"
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-primary-500/10">
            {data.map((row, idx) => {
              const key = row?.[resolvedKeyField] ?? idx
              return (
                <tr key={String(key)} className="hover:bg-primary-600/5">
                  {columns.map((c) => {
                    const val = row[c.key]
                    return (
                      <td key={String(c.key)} className="px-4 py-3 text-sm text-slate-200">
                        {c.render ? c.render(val, row) : (val as ReactNode)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
