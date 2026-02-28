import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface RankProgress {
  currentRank: string;
  nextRank: string | null;
  nextRankRequirements: {
    requiredDirects: number;
    requiredRankL1: number;
  } | null;
  qualifiedDirects: number;
  qualifiedRankL1Directs: number;
  isQualified: boolean;
}

interface DirectReferral {
  userId: string;
  walletAddress: string;
  currentRank: string;
  totalDeposited: string;
  qualifyingDeposits: number;
  isQualified: boolean;
  joinedAt: string;
}

const RANK_INFO = {
  L0: { name: 'No Rank', color: 'gray', icon: '⚪', cap: '200%' },
  L1: { name: 'Bronze', color: 'orange', icon: '🥉', cap: '300%' },
  L2: { name: 'Silver', color: 'gray', icon: '🥈', cap: '300%' },
  L3: { name: 'Gold', color: 'yellow', icon: '🥇', cap: '300%' },
  L4: { name: 'Platinum', color: 'cyan', icon: '💎', cap: '300%' },
  L5: { name: 'Diamond', color: 'blue', icon: '💠', cap: '300%' },
  L6: { name: 'Master', color: 'purple', icon: '👑', cap: '300%' },
  L7: { name: 'Legend', color: 'red', icon: '⭐', cap: '300%' },
};

export const RankCard: React.FC = () => {
  const { data: progress, isLoading: loadingProgress } = useQuery<RankProgress>({
    queryKey: ['rank-progress'],
    queryFn: async () => {
      const response = await api.get('/v1/ranks/progress');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: directs, isLoading: loadingDirects } = useQuery<DirectReferral[]>({
    queryKey: ['rank-directs'],
    queryFn: async () => {
      const response = await api.get('/v1/ranks/directs');
      return response.data;
    },
    refetchInterval: 60000,
  });

  if (loadingProgress || loadingDirects) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (!progress || !directs) return null;

  const currentRankInfo = RANK_INFO[progress.currentRank as keyof typeof RANK_INFO] || RANK_INFO.L0;
  const nextRankInfo = progress.nextRank
    ? RANK_INFO[progress.nextRank as keyof typeof RANK_INFO]
    : null;

  return (
    <div className="space-y-6">
      {/* Current Rank Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90">Current Rank</div>
            <div className="text-4xl font-bold mt-1 flex items-center gap-3">
              <span>{currentRankInfo.icon}</span>
              <span>{currentRankInfo.name}</span>
            </div>
            <div className="text-sm opacity-90 mt-2">ROI Cap: {currentRankInfo.cap}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Qualified Directs</div>
            <div className="text-3xl font-bold">{progress.qualifiedDirects}</div>
          </div>
        </div>

        {progress.currentRank === 'L0' && (
          <div className="mt-4 bg-white/10 rounded p-3">
            <p className="text-sm">
              🎯 Achieve rank L1 to unlock 300% ROI cap and weekly rank pool rewards!
            </p>
          </div>
        )}
      </div>

      {/* Next Rank Progress */}
      {nextRankInfo && progress.nextRankRequirements && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Next Rank: {nextRankInfo.icon} {nextRankInfo.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Complete the requirements below to upgrade
              </p>
            </div>
            {progress.isQualified && (
              <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm font-semibold rounded-full">
                ✓ Qualified
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Required Directs */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Direct Referrals ($100+ deposited)
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.qualifiedDirects} / {progress.nextRankRequirements.requiredDirects}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    progress.qualifiedDirects >= progress.nextRankRequirements.requiredDirects
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      (progress.qualifiedDirects / progress.nextRankRequirements.requiredDirects) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Required L1+ Directs (for L2+) */}
            {progress.nextRankRequirements.requiredRankL1 > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Directs with Rank L1+
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {progress.qualifiedRankL1Directs} / {progress.nextRankRequirements.requiredRankL1}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      progress.qualifiedRankL1Directs >= progress.nextRankRequirements.requiredRankL1
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        (progress.qualifiedRankL1Directs / progress.nextRankRequirements.requiredRankL1) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {progress.currentRank === 'L7' && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow p-6 text-white">
          <div className="text-center">
            <div className="text-5xl mb-2">🏆</div>
            <h3 className="text-2xl font-bold">Congratulations!</h3>
            <p className="mt-2">You have achieved the highest rank: Legend!</p>
          </div>
        </div>
      )}

      {/* Direct Referrals Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Direct Referrals ({directs.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {directs.filter((d) => d.isQualified).length} qualified for rank requirements
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Deposited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  $100+ Deposits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {directs.map((direct) => {
                const rankInfo = RANK_INFO[direct.currentRank as keyof typeof RANK_INFO] || RANK_INFO.L0;
                return (
                  <tr key={direct.userId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {direct.walletAddress.substring(0, 6)}...{direct.walletAddress.substring(38)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="flex items-center gap-1">
                        {rankInfo.icon} {rankInfo.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${parseFloat(direct.totalDeposited).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {direct.qualifyingDeposits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          direct.isQualified
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {direct.isQualified ? 'Qualified' : 'Not Qualified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(direct.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          💡 How Rank Qualification Works
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>L1 Bronze:</strong> 5 direct referrals with $100+ deposited each</li>
          <li>• <strong>L2 Silver:</strong> 3 directs with L1+ rank (who also qualified)</li>
          <li>• <strong>L3+ Gold and above:</strong> Progressive requirements based on ranked directs</li>
          <li>• Ranks are checked automatically after every $100+ deposit</li>
          <li>• Achieving L1+ increases your ROI cap from 200% to 300%</li>
          <li>• Ranked users share weekly pool rewards (0.3% of total deposits)</li>
        </ul>
      </div>
    </div>
  );
};
