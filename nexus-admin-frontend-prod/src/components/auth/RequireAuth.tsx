import React from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated, getUser, auth } from '../../lib/auth'

const bypassEnabled = import.meta.env.VITE_BYPASS_AUTH === 'true'

interface Props {
  children: JSX.Element
  adminOnly?: boolean
}

export function RequireAuth({ children, adminOnly = false }: Props) {
  // If bypass is enabled, inject fake admin user and allow access
  if (bypassEnabled && !auth.getUser()) {
    const fakeAdmin = { id: 'dev-user', address: '0xdev', role: 'ADMIN' as const }
    auth.setUser(fakeAdmin)
    auth.setBypass(true)
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly) {
    const user = getUser()
    if (!user || user.role !== 'ADMIN') {
      return <Navigate to="/login" replace />
    }
  }

  // Show dev banner if bypass is active
  if (bypassEnabled && auth.isBypassEnabled()) {
    return (
      <div>
        <div className="sticky top-0 z-50 bg-amber-100 border-b border-amber-300 px-4 py-2 text-sm text-amber-800 font-semibold">
          ⚠️ Auth bypass enabled (dev only)
        </div>
        {children}
      </div>
    )
  }

  return children
}
