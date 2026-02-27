import React, { useState } from 'react'
import { ethers } from 'ethers'
import { walletNonce, walletVerify } from '../../lib/api'
import { auth } from '../../lib/auth'

function shorten(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function WalletLoginButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const eth = (window as any).ethereum
      if (!eth) {
        throw new Error('Wallet not detected. Please install MetaMask.')
      }

      const provider = new ethers.BrowserProvider(eth)
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
      setError(err?.message || 'Login failed')
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
          <p className="text-sm text-gray-600">Connected as</p>
          <p className="font-mono text-lg font-semibold">{shorten(user?.address || '')}</p>
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
    <div className="space-y-4 w-full">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}