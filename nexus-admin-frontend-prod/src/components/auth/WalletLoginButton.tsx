import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { walletNonce, walletVerify } from '../../lib/api'
import { auth } from '../../lib/auth'

function shorten(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function WalletLoginButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Async wallet detection
  useEffect(() => {
    const detectWallet = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    detectWallet()
  }, [])

  const handleLogin = async () => {
    setError('')
    
    // Check wallet before attempting connection
    if (!window.ethereum) {
      setShowModal(true)
      return
    }

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // IMPORTANT: backend validates against ALLOWED_ORIGINS (must be full origin)
      const domain = window.location.origin

      // 1) Get nonce + issuedAt from backend
      const nonceRes = await walletNonce(address, domain)

      // 2) Sign message from backend
      const signature = await signer.signMessage(nonceRes.messageToSign)

      // 3) Verify using same issuedAt
      const verifyRes = await walletVerify(address, signature, domain, nonceRes.issuedAt)

      auth.setToken(verifyRes.token)
      auth.setUser(verifyRes.user)
      window.location.href = '/'
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection request rejected. Please approve the request to continue.')
      } else {
        setError(err?.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    auth.logout()
    window.location.href = '/login'
  }

  if (auth.isAuthenticated()) {
    const user = auth.getUser()
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">Connected as</p>
          <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">{shorten(user?.address || '')}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Connecting...
              </>
            ) : (
              <>
                <span>🦊</span>
                Login with Wallet
              </>
            )}
          </button>

          {/* Help Icon */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
              onClick={() => setShowHelp(!showHelp)}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-bold transition-colors"
              aria-label="Help"
            >
              ?
            </button>
            
            {showHelp && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Admin Connection Guide</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Ensure MetaMask is unlocked</li>
                  <li>• Set network to <span className="font-semibold text-blue-600 dark:text-blue-400">BSC Testnet</span></li>
                  <li>• Use an authorized admin wallet address</li>
                  <li>• Approve the connection request</li>
                  <li>• Sign the message to authenticate</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Wallet Installation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🦊</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Wallet Extension Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Admin access requires a Web3 wallet browser extension like MetaMask.
              </p>
              
              <div className="space-y-3 mb-6">
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Download MetaMask
                </a>
                <a
                  href="https://trustwallet.com/browser-extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Download Trust Wallet
                </a>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                After installing, refresh this page to connect.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}