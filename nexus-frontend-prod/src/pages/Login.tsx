import WalletLoginButton from '../components/WalletLoginButton'
import { auth } from '../lib/auth'
import { Navigate, useLocation } from 'react-router-dom'

export default function Login() {
  const location = useLocation() as any
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/'
  const user = auth.getUser()

  if (user) return <Navigate to={returnTo} replace />

  return (
    <div className="defi-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="defi-card overflow-hidden">
          <div className="px-6 py-8 text-center">
            <div className="text-4xl mb-2">⚡</div>
            <h1 className="text-xl font-semibold text-slate-100 glow-text">Connect Wallet</h1>
            <p className="text-sm text-slate-400 mt-1">Access your Nexus Protocol dashboard</p>
            <div className="mt-6">
              <WalletLoginButton />
            </div>
          </div>

          <div className="px-6 pb-6 text-xs text-slate-400 leading-relaxed">
            <p>Use MetaMask (recommended) or any EVM-compatible wallet in your browser.</p>
            <p className="mt-2">
              Signing is only for authentication. No gas fee is charged for login.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-primary-500/10 text-xs text-slate-500 flex items-center justify-between">
            <span>nr.stackmeridian.com</span>
            <span className="text-primary-100">Nexus Protocol</span>
          </div>
        </div>
      </div>
    </div>
  )
}
