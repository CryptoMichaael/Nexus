import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  toAddress: string;
  depositAddress: string;
  adminOverrideAddress: string | null;
  adminApprovedBy: string | null;
  status: string;
  txHash: string | null;
  createdAt: string;
  processedAt: string | null;
}

export const WithdrawalManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(null);
  const [overrideAddress, setOverrideAddress] = useState('');

  const { data: withdrawals, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const response = await api.get('/v1/admin/withdrawals');
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ id, newAddress }: { id: string; newAddress: string }) => {
      const response = await api.post(`/v1/admin/withdrawals/${id}/override-address`, { newAddress });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setSelectedWithdrawal(null);
      setOverrideAddress('');
      alert('Withdrawal address overridden successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to override address: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleOverride = (id: string) => {
    if (!overrideAddress.trim()) {
      alert('Please enter a valid override address');
      return;
    }
    if (!window.confirm(`Are you sure you want to override the withdrawal address for this transaction? This action will be logged.`)) {
      return;
    }
    overrideMutation.mutate({ id, newAddress: overrideAddress });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  const pendingWithdrawals = withdrawals?.filter((w) => w.status === 'pending') || [];
  const processingWithdrawals = withdrawals?.filter((w) => w.status === 'processing') || [];
  const addressMismatchWithdrawals =
    withdrawals?.filter((w) => w.toAddress.toLowerCase() !== w.depositAddress.toLowerCase()) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Withdrawals</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{withdrawals?.length || 0}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-6">
          <div className="text-sm text-yellow-600 dark:text-yellow-400">Pending</div>
          <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">{pendingWithdrawals.length}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-6">
          <div className="text-sm text-blue-600 dark:text-blue-400">Processing</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-200 mt-1">{processingWithdrawals.length}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6">
          <div className="text-sm text-red-600 dark:text-red-400">Address Overrides</div>
          <div className="text-3xl font-bold text-red-900 dark:text-red-200 mt-1">{addressMismatchWithdrawals.length}</div>
        </div>
      </div>

      {/* Address Mismatch Warning */}
      {addressMismatchWithdrawals.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                {addressMismatchWithdrawals.length} withdrawal(s) have address overrides
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                These withdrawals are being sent to addresses that differ from the original deposit address. Review carefully.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Withdrawals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  To Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Deposit Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {withdrawals?.map((withdrawal) => {
                const isOverridden = withdrawal.toAddress.toLowerCase() !== withdrawal.depositAddress.toLowerCase();
                const isSelected = selectedWithdrawal === withdrawal.id;

                return (
                  <React.Fragment key={withdrawal.id}>
                    <tr className={isOverridden ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {withdrawal.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        ${parseFloat(withdrawal.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {isOverridden && (
                          <span className="mr-1 text-red-600 dark:text-red-400" title="Address override">
                            ⚠️
                          </span>
                        )}
                        <span className="text-gray-900 dark:text-white">
                          {withdrawal.toAddress.substring(0, 6)}...{withdrawal.toAddress.substring(38)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
                        {withdrawal.depositAddress.substring(0, 6)}...{withdrawal.depositAddress.substring(38)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            withdrawal.status === 'success'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : withdrawal.status === 'processing'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : withdrawal.status === 'failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(withdrawal.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {withdrawal.status === 'pending' && (
                          <button
                            onClick={() => setSelectedWithdrawal(isSelected ? null : withdrawal.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            {isSelected ? 'Cancel' : 'Override Address'}
                          </button>
                        )}
                        {withdrawal.txHash && (
                          <a
                            href={`https://testnet.bscscan.com/tx/${withdrawal.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            View TX
                          </a>
                        )}
                      </td>
                    </tr>
                    {isSelected && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Withdrawal Address
                              </label>
                              <input
                                type="text"
                                value={overrideAddress}
                                onChange={(e) => setOverrideAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOverride(withdrawal.id)}
                                disabled={overrideMutation.isPending}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50"
                              >
                                {overrideMutation.isPending ? 'Processing...' : 'Override Address'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedWithdrawal(null);
                                  setOverrideAddress('');
                                }}
                                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
