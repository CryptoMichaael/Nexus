import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageShell } from '../components/layout/PageShell'
import { Table } from '../components/common/Table'
import { Badge } from '../components/common/Badge'
import { Pagination } from '../components/common/Pagination'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { Skeleton } from '../components/common/Skeleton'
import { api } from '../lib/api'
import { Withdrawal } from '../lib/types'

export function Withdrawals() {
  const queryClient = useQueryClient()
  const [cursor, setCursor] = useState<string | undefined>()
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const { data: withdrawalsData, isLoading, error, refetch } = useQuery({
    queryKey: ['withdrawals', cursor],
    queryFn: () => api.getWithdrawals(cursor, 20),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount)
      if (!parsedAmount || parsedAmount <= 0) {
        throw new Error('Amount must be greater than 0')
      }
      if (!address || address.trim().length === 0) {
        throw new Error('Address is required')
      }
      if (!address.startsWith('0x') || address.length !== 42) {
        throw new Error('Invalid Ethereum address format')
      }
      return api.submitWithdrawal(parsedAmount, address)
    },
    onSuccess: () => {
      setAmount('')
      setAddress('')
      setSubmitError('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
    },
    onError: (err) => {
      setSubmitError((err as Error).message)
      setSubmitSuccess(false)
    },
  })

  const handleLoadMore = () => {
    if (withdrawalsData?.nextCursor) {
      setCursor(withdrawalsData.nextCursor)
      if (withdrawalsData.data) {
        setAllWithdrawals((prev) => [...prev, ...withdrawalsData.data])
      }
    }
  }

  if (error && !withdrawalsData?.data) {
    return (
      <PageShell title="Withdrawals">
        <ErrorState
          title="Failed to load withdrawals"
          message="Could not fetch withdrawal data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  const displayWithdrawals = cursor ? allWithdrawals : withdrawalsData?.data || []

  const columns = [
    {
      key: 'amount' as const,
      label: 'Amount',
      render: (val: unknown) => (
        <span className="font-semibold">
          ${new Intl.NumberFormat('en-US').format(val as number)}
        </span>
      ),
    },
    {
      key: 'address' as const,
      label: 'Address',
      render: (val: unknown) => (
        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
          {String(val).slice(0, 10)}...
        </code>
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (val: unknown) => {
        const variant =
          val === 'success'
            ? 'success'
            : val === 'processing'
              ? 'warning'
              : val === 'pending'
                ? 'info'
                : 'error'
        return <Badge label={String(val)} variant={variant} />
      },
    },
    {
      key: 'createdAt' as const,
      label: 'Date',
      render: (val: unknown) =>
        new Date(val as string).toLocaleDateString('en-US'),
    },
  ]

  return (
    <PageShell title="Withdrawals">
      <div className="space-y-6">
        {/* Submission Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Request Withdrawal
          </h3>

          {submitSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              Withdrawal request submitted successfully!
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ethereum Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              />
            </div>
          </div>

          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitMutation.isPending ? 'Processing...' : 'Submit Withdrawal'}
          </button>
        </div>

        {/* History */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Withdrawal History
          </h3>

          {isLoading && !displayWithdrawals.length ? (
            <Skeleton />
          ) : displayWithdrawals.length === 0 ? (
            <EmptyState
              icon="💸"
              title="No withdrawals"
              description="You haven't requested any withdrawals yet."
            />
          ) : (
            <>
              <Table<Withdrawal> columns={columns} data={displayWithdrawals} />
              <Pagination
                hasMore={withdrawalsData?.hasMore || false}
                isLoading={isLoading}
                onLoadMore={handleLoadMore}
              />
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
