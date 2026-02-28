import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

function shorten(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function WalletLoginButton() {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Async wallet detection on mount
  useEffect(() => {
    const detectWallet = async () => {
      // Wait for wallet injection (some wallets inject asynchronously)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    detectWallet()
  }, [])

  const handleConnect = async () => {
    // Check wallet availability before attempting connection
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
      const domain = window.location.origin
      const nonceRes = await api.walletNonce(address, domain)
      const sig = await signer.signMessage(nonceRes.messageToSign)
      const verifyRes = await api.walletVerify(address, sig, domain, nonceRes.issuedAt)
      auth.setToken(verifyRes.token)
      auth.setUser(verifyRes.user)
      window.location.href = '/'
    } catch (err: any) {
      if (err.code === 4001) {
        alert('Connection request rejected. Please approve the request to continue.')
      } else {
        alert(err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  if (auth.isAuthenticated()) {
    const user: any = auth.getUser()
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono">{shorten(user?.address || '')}</span>
        <button
          onClick={() => {
            auth.logout()
            window.location.href = '/login'
          }}
          className="text-red-500 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
        
        {/* Help Icon */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
            onClick={() => setShowHelp(!showHelp)}
            className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-sm font-bold transition-colors"
            aria-label="Help"
          >
            ?
          </button>
          
          {showHelp && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Connection Guide</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Ensure MetaMask is unlocked</li>
                <li>• Set network to <span className="font-semibold text-blue-600 dark:text-blue-400">BSC Testnet</span></li>
                <li>• Approve the connection request</li>
                <li>• Sign the message to authenticate</li>
              </ul>
            </div>
          )}
        </div>
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
                To connect, please install a Web3 wallet browser extension like MetaMask, Trust Wallet, or Coinbase Wallet.
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
                <a
                  href="https://www.coinbase.com/wallet/downloads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Download Coinbase Wallet
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
