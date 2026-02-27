import React from 'react'
import { lazy } from 'react'
import { RequireAuth } from './components/auth/RequireAuth'

// Lazily load pages for performance
const LoginPage = lazy(() => import('./pages/Login'))
const AdminDashboard = lazy(() => import('./pages/Dashboard'))
const UsersPage = lazy(() => import('./pages/Users'))
const LedgerPage = lazy(() => import('./pages/Ledger'))
const WithdrawalsPage = lazy(() => import('./pages/Withdrawals'))

export const routes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <RequireAuth adminOnly><AdminDashboard /></RequireAuth> },
  { path: '/users', element: <RequireAuth adminOnly><UsersPage /></RequireAuth> },
  { path: '/ledger', element: <RequireAuth adminOnly><LedgerPage /></RequireAuth> },
  { path: '/withdrawals', element: <RequireAuth adminOnly><WithdrawalsPage /></RequireAuth> },
]
