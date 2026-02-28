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
  { to: '/network/overview', label: 'Community' },
  { to: '/network/team', label: 'Referrals' },
  { to: '/network/tree', label: 'Referral Map' },
  { to: '/deposits', label: 'Staking' },
  { to: '/withdrawals', label: 'Claims' },
  { to: '/ledger', label: 'Activity' },
]

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const location = useLocation()
  const user = auth.getUser()

  return (
    <div className="defi-bg">
      <header className="sticky top-0 z-40 border-b border-primary-500/20 bg-black/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-primary-500/30 bg-black/60 text-primary-100 flex items-center justify-center font-bold shadow-[0_0_24px_rgba(244,197,66,0.18)]">
              N
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-100">Nexus Protocol</div>
              <div className="text-xs text-slate-400">Staking Dashboard</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.address ? (
              <div className="defi-pill font-mono">
                <span className="text-[10px] text-slate-300">Wallet</span>
                <span>{shorten(String(user.address))}</span>
              </div>
            ) : null}

            <button
              className="defi-btn"
              onClick={() => {
                auth.logout()
                window.location.href = '/login'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4 pb-4">
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
                      ? 'bg-primary-600 text-black border-primary-500 shadow-[0_0_18px_rgba(244,197,66,0.22)]'
                      : 'bg-black/40 text-slate-200 border-primary-500/15 hover:bg-primary-600/10 hover:border-primary-500/35'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          <div className="mt-4 defi-divider" />
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-100 glow-text">{title}</h1>
          <div className="text-xs text-slate-400 mt-1">DeFi-style dashboard UI • dark + gold theme</div>
        </div>
        {children}
      </main>
    </div>
  )
}
