import { useState } from 'react'
import { ethers } from 'ethers'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

function shorten(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function WalletLoginButton() {
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    try {
      if (!(window as any).ethereum) throw new Error('No wallet provider')
      const provider = new ethers.BrowserProvider((window as any).ethereum)
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
      alert(err.message || 'Login failed')
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
          className="text-red-500"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      {loading ? 'Connecting...' : 'Login with Wallet'}
    </button>
  )
}
