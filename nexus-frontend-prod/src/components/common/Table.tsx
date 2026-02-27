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
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3"
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => {
              const key = row?.[resolvedKeyField] ?? idx
              return (
                <tr key={String(key)} className="hover:bg-slate-50">
                  {columns.map((c) => {
                    const val = row[c.key]
                    return (
                      <td key={String(c.key)} className="px-4 py-3 text-sm text-slate-700">
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
