import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { auth } from '../lib/auth'
import { api } from '../lib/api'

const bypassEnabled = import.meta.env.VITE_BYPASS_AUTH === 'true'

export function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation()
  let token = auth.getToken()

  // If bypass is enabled and no token, inject a fake user
  if (bypassEnabled && !token) {
    const fakeUser = { id: 'dev-user', address: '0xdev000000000000000000000000000000000001', role: 'USER' }
    auth.setToken('dev-bypass-token')
    auth.setUser(fakeUser)
    token = 'dev-bypass-token'
  }

  // No token → go login
  if (!token) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  // Verify token with backend only if not in bypass mode
  const { isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    retry: false,
    enabled: !bypassEnabled,
  })

  if (!bypassEnabled && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your account...</p>
        </div>
      </div>
    )
  }

  if (!bypassEnabled && isError) {
    auth.logout()
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  // Show dev banner if bypass is active
  if (bypassEnabled) {
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
