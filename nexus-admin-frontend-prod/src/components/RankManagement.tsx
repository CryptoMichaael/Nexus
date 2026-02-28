import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface RankStats {
  L0: number;
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
  L6: number;
  L7: number;
}

interface EcosystemStats {
  totalUsers: number;
  totalDeposits: string;
  totalROIPaid: string;
  totalMLMPaid: string;
  totalClaimableBalance: string;
}

const RANK_INFO = {
  L0: { name: 'No Rank', color: 'gray', icon: '⚪' },
  L1: { name: 'Bronze', color: 'orange', icon: '🥉' },
  L2: { name: 'Silver', color: 'gray', icon: '🥈' },
  L3: { name: 'Gold', color: 'yellow', icon: '🥇' },
  L4: { name: 'Platinum', color: 'cyan', icon: '💎' },
  L5: { name: 'Diamond', color: 'blue', icon: '💠' },
  L6: { name: 'Master', color: 'purple', icon: '👑' },
  L7: { name: 'Legend', color: 'red', icon: '⭐' },
};

export const RankManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [targetRank, setTargetRank] = useState('L1');

  const { data: rankStats } = useQuery<RankStats>({
    queryKey: ['admin-rank-stats'],
    queryFn: async () => {
      const response = await api.get('/v1/admin/stats/ranks');
      return response.data;
    },
    refetchInterval: 60000,
  });

  const { data: ecosystemStats } = useQuery<EcosystemStats>({
    queryKey: ['admin-ecosystem-stats'],
    queryFn: async () => {
      const response = await api.get('/v1/admin/stats/ecosystem');
      return response.data;
    },
    refetchInterval: 60000,
  });

  const manualUpgrade = useMutation({
    mutationFn: async ({ userId, rank }: { userId: string; rank: string }) => {
      const response = await api.post('/v1/ranks/manual-upgrade', { userId, targetRank: rank });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rank-stats'] });
      setUserId('');
      alert('Rank upgraded successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to upgrade rank: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      alert('Please enter a user ID');
      return;
    }
    manualUpgrade.mutate({ userId, rank: targetRank });
  };

  const totalUsers = rankStats ? Object.values(rankStats).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Ecosystem Statistics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ecosystem Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {ecosystemStats?.totalUsers.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Deposits</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              ${parseFloat(ecosystemStats?.totalDeposits || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">ROI Paid</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
              ${parseFloat(ecosystemStats?.totalROIPaid || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">MLM Paid</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              ${parseFloat(ecosystemStats?.totalMLMPaid || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Claimable Balance</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              ${parseFloat(ecosystemStats?.totalClaimableBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Rank Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Rank Distribution</h3>
        <div className="space-y-3">
          {rankStats &&
            Object.entries(RANK_INFO).map(([rank, info]) => {
              const count = rankStats[rank as keyof RankStats] || 0;
              const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;

              return (
                <div key={rank} className="flex items-center">
                  <div className="w-32 flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{info.name}</span>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                      <div
                        className={`h-6 rounded-full flex items-center justify-end pr-2 text-xs font-semibold text-white transition-all duration-500 bg-${info.color}-500`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      >
                        {percentage > 5 && `${percentage.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{count}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Manual Rank Upgrade */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Manual Rank Upgrade</h3>
        <form onSubmit={handleUpgrade} className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user UUID"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="targetRank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Rank
            </label>
            <select
              id="targetRank"
              value={targetRank}
              onChange={(e) => setTargetRank(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(RANK_INFO)
                .slice(1)
                .map(([rank, info]) => (
                  <option key={rank} value={rank}>
                    {info.icon} {info.name} ({rank})
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={manualUpgrade.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {manualUpgrade.isPending ? 'Upgrading...' : 'Upgrade Rank'}
          </button>
        </form>

        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Warning:</strong> Manual rank upgrades bypass qualification requirements. Use only when absolutely necessary.
            This action will upgrade the user's ROI cap to 300% and grant access to weekly rank pool distributions.
          </p>
        </div>
      </div>
    </div>
  );
};
