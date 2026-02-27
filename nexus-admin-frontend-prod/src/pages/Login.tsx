import WalletLoginButton from '../components/auth/WalletLoginButton'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-0">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-8 py-8 sm:py-10 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Nexus Admin</h1>
            <p className="text-blue-100 text-sm">Secure wallet-based authentication</p>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-8 py-8 space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Connect with MetaMask</span> or any Web3 wallet to access the admin dashboard.
              </p>
            </div>

            {/* Login Button */}
            <WalletLoginButton />

            {/* Footer Help Text */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-600 text-center">
                Don't have a wallet?{' '}
                <a
                  href="https://metamask.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Install MetaMask
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <p className="text-center text-gray-400 text-xs mt-6">
          © 2026 Nexus Rewards. All rights reserved.
        </p>
      </div>
    </div>
  )
}
