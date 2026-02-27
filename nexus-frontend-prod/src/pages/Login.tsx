import WalletLoginButton from '../components/WalletLoginButton'
import { auth } from '../lib/auth'
import { Navigate, useLocation } from 'react-router-dom'

export default function Login() {
  const location = useLocation() as any
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/'
  const user = auth.getUser()

  // If already logged in, go back
  if (user) return <Navigate to={returnTo} replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-8 text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-xl font-semibold">Login to Nexus Rewards</h1>
            <p className="text-sm text-white/80 mt-1">
              Connect your wallet to continue
            </p>
          </div>

          <div className="p-6 space-y-4">
            <WalletLoginButton />

            <div className="text-xs text-slate-500 leading-relaxed">
              <p>
                Use MetaMask (recommended) or any EVM compatible wallet in your
                browser.
              </p>
              <p className="mt-2">
                By signing, you confirm this wallet belongs to you. No gas fee is
                charged for login.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t text-xs text-slate-500 flex items-center justify-between">
            <span>nr.stackmeridian.com</span>
            <span>Nexus Rewards</span>
          </div>
        </div>
      </div>
    </div>
  )
}
