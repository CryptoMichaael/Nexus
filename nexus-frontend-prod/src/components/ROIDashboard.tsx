import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ROIStats {
  activeDeposits: number;
  totalPrincipal: string;
  totalAccumulatedROI: string;
  totalMaxROI: string;
  deposits: Array<{
    depositId: string;
    principal: string;
    accumulated: string;
    maxROI: string;
    status: string;
    dailyRate: number;
    startDate: string;
    lastCalculated: string | null;
  }>;
}

export const ROIDashboard: React.FC = () => {
  const { data: roiStats, isLoading } = useQuery<ROIStats>({
    queryKey: ['roi-stats'],
    queryFn: async () => {
      const response = await api.get('/v1/users/roi-status');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (!roiStats) return null;

  const totalPrincipal = parseFloat(roiStats.totalPrincipal);
  const totalAccumulated = parseFloat(roiStats.totalAccumulatedROI);
  const totalMax = parseFloat(roiStats.totalMaxROI);
  const progressPercent = totalMax > 0 ? (totalAccumulated / totalMax) * 100 : 0;
  const capPercent = totalMax > 0 ? (totalMax / totalPrincipal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Deposited</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            ${Number(roiStats.totalPrincipal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">Principal (Locked)</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">ROI Earned</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            ${Number(roiStats.totalAccumulatedROI).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">0.3% Daily</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Max ROI Cap</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            ${Number(roiStats.totalMaxROI).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">{capPercent.toFixed(0)}% Cap</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Deposits</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {roiStats.activeDeposits}
          </div>
          <div className="text-xs text-gray-500 mt-1">Generating ROI</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              ROI Progress to {capPercent.toFixed(0)}% Cap
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {progressPercent.toFixed(2)}% of maximum ROI reached
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(totalMax - totalAccumulated).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
        </div>
        
        <div className="relative pt-1">
          <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                progressPercent >= 100
                  ? 'bg-red-500'
                  : progressPercent >= 75
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
            ></div>
          </div>
        </div>

        {progressPercent >= 100 && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              ⚠️ <strong>ROI Cap Reached:</strong> You have reached your maximum ROI limit. No more daily ROI will be credited.
            </p>
          </div>
        )}

        {capPercent === 200 && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Unlock 300% Cap:</strong> Achieve rank L1 or higher to increase your ROI cap to 300%!
            </p>
          </div>
        )}
      </div>

      {/* Deposits Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Deposits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Accumulated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Max ROI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Start Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {roiStats.deposits.map((deposit) => {
                const principal = parseFloat(deposit.principal);
                const accumulated = parseFloat(deposit.accumulated);
                const maxROI = parseFloat(deposit.maxROI);
                const depositProgress = maxROI > 0 ? (accumulated / maxROI) * 100 : 0;

                return (
                  <tr key={deposit.depositId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      ${accumulated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      ${maxROI.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              depositProgress >= 100 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(depositProgress, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {depositProgress.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          deposit.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {deposit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(deposit.startDate).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Principal Permanently Locked
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                Your deposited principal (${Number(roiStats.totalPrincipal).toLocaleString()}) is permanently locked. 
                You can only withdraw ROI earnings, MLM commissions, and rank rewards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
