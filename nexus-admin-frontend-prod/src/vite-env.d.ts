/// <reference types="vite/client" />

// Wallet provider type definitions
interface Window {
  ethereum?: {
    isMetaMask?: boolean
    isTrust?: boolean
    request: (args: { method: string; params?: any[] }) => Promise<any>
    on?: (event: string, callback: (...args: any[]) => void) => void
    removeListener?: (event: string, callback: (...args: any[]) => void) => void
  }
  trustwallet?: any
  coinbaseWallet?: any
}
