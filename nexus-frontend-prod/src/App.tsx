import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { routes } from './routes'
import { queryClient } from './lib/queryClient'
import { WalletProviderGuard } from './components/WalletProviderGuard'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProviderGuard>
        <BrowserRouter>
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WalletProviderGuard>
    </QueryClientProvider>
  )
}
