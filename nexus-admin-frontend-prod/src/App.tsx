import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { routes } from './routes'
import { queryClient } from './lib/queryClient'
import { AdminWalletGuard } from './components/AdminWalletGuard'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminWalletGuard>
        <BrowserRouter>
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminWalletGuard>
    </QueryClientProvider>
  )
}
