import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/auth';
import { api } from '../lib/api';

interface AdminWalletGuardProps {
  children: React.ReactNode;
}

interface AdminAllowlistCheck {
  allowed: boolean;
  walletAddress: string;
  role: string;
}

export const AdminWalletGuard: React.FC<AdminWalletGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminAuthorization = async () => {
      try {
        // Step 1: Check for Web3 provider
        const hasMetaMask = typeof window.ethereum !== 'undefined';
        const hasTrustWallet = typeof (window as any).trustwallet !== 'undefined';
        const hasCoinbaseWallet = typeof (window as any).coinbaseWallet !== 'undefined';
        
        setHasProvider(hasMetaMask || hasTrustWallet || hasCoinbaseWallet);

        if (!hasMetaMask && !hasTrustWallet && !hasCoinbaseWallet) {
          setStatus('unauthorized');
          return;
        }

        // Step 2: Check JWT token exists
        const token = auth.getToken();
        if (!token) {
          setStatus('unauthorized');
          navigate('/login');
          return;
        }

        // Step 3: Get current user from JWT
        const user = auth.getUser();
        if (!user) {
          setStatus('unauthorized');
          navigate('/login');
          return;
        }

        // Step 4: Verify admin allowlist (backend check)
        try {
          const response = await api.get('/v1/admin/verify-allowlist');
          const data = response.data as AdminAllowlistCheck;

          if (!data.allowed || data.role !== 'ADMIN') {
            console.error('Admin authorization failed:', data);
            setStatus('unauthorized');
            return;
          }

          // All checks passed
          setStatus('authorized');
        } catch (error: any) {
          console.error('Admin allowlist check failed:', error);
          setStatus('unauthorized');
        }
      } catch (error) {
        console.error('Admin guard error:', error);
        setStatus('unauthorized');
      }
    };

    checkAdminAuthorization();
  }, [navigate]);

  // Loading state
  if (status === 'checking' || hasProvider === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-400">Verifying admin authorization...</div>
        </div>
      </div>
    );
  }

  // No wallet provider detected
  if (hasProvider === false) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Admin Access Denied
            </h1>
            <p className="text-gray-400 mb-6">
              Web3 wallet extension is required for admin panel access. Please install MetaMask or Trust Wallet.
            </p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Download MetaMask
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized (not in allowlist or wrong role)
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⛔</div>
            <h1 className="text-3xl font-bold text-red-500 mb-4">
              403 Unauthorized
            </h1>
            <p className="text-gray-300 mb-2">
              <strong>Admin Access Denied</strong>
            </p>
            <p className="text-gray-400 mb-6">
              Your wallet address is not authorized to access the admin panel. 
              Please contact the system administrator to request access.
            </p>
            
            <div className="bg-red-900/20 border border-red-800 rounded p-4 mb-6">
              <p className="text-sm text-red-200">
                <strong>Security Notice:</strong> This attempt has been logged for security purposes.
              </p>
            </div>

            <button
              onClick={() => {
                auth.logout();
                navigate('/login');
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - render admin panel
  return <>{children}</>;
};
