import React, { useEffect, useState } from 'react';

interface WalletProviderGuardProps {
  children: React.ReactNode;
}

export const WalletProviderGuard: React.FC<WalletProviderGuardProps> = ({ children }) => {
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for Web3 wallet providers
    const checkProvider = () => {
      const hasMetaMask = typeof window.ethereum !== 'undefined';
      const hasTrustWallet = typeof (window as any).trustwallet !== 'undefined';
      const hasCoinbaseWallet = typeof (window as any).coinbaseWallet !== 'undefined';
      
      setHasProvider(hasMetaMask || hasTrustWallet || hasCoinbaseWallet);
    };

    // Initial check
    checkProvider();

    // Recheck after delay (some wallets inject provider asynchronously)
    const timer = setTimeout(checkProvider, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (hasProvider === null) {
    // Loading state
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-600 dark:text-gray-400">
          Checking for wallet provider...
        </div>
      </div>
    );
  }

  if (!hasProvider) {
    // No provider detected - show installation modal
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🦊</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Web3 Wallet Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              To use this application, you need a Web3 wallet browser extension like MetaMask, Trust Wallet, or Coinbase Wallet.
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

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> After installing the wallet extension, please refresh this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Provider detected - render app
  return <>{children}</>;
};
