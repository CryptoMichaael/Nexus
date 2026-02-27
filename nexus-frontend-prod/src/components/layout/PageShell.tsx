import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { auth } from '../../lib/auth'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function shorten(addr: string) {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/network/overview', label: 'Network' },
  { to: '/network/team', label: 'Team' },
  { to: '/network/tree', label: 'Tree' },
  { to: '/deposits', label: 'Deposits' },
  { to: '/withdrawals', label: 'Withdrawals' },
  { to: '/ledger', label: 'Ledger' },
]

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const location = useLocation()
  const user = auth.getUser()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
              N
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">Nexus Rewards</div>
              <div className="text-xs text-slate-500">User Dashboard</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.address ? (
              <div className="text-sm text-slate-600 font-mono">{shorten(String(user.address))}</div>
            ) : null}
            <button
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50"
              onClick={() => {
                auth.logout()
                window.location.href = '/login'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cx(
                    'px-3 py-1.5 text-sm rounded-md border transition',
                    active
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  )
}
