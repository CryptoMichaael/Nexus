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
import { auth } from '../lib/auth'
import { Withdrawal } from '../lib/types'

export function Withdrawals() {
  const queryClient = useQueryClient()
  const [cursor, setCursor] = useState<string | undefined>()
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const receiver = auth.getUser()?.address

  const { data: withdrawalsData, isLoading, error, refetch } = useQuery({
    queryKey: ['withdrawals', cursor],
    queryFn: () => api.getWithdrawals(cursor, 20),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount)
      if (!parsedAmount || parsedAmount <= 0) throw new Error('Amount must be greater than 0')
      if (!receiver) throw new Error('Wallet not connected. Please login again.')
      return api.submitWithdrawal(parsedAmount, String(receiver))
    },
    onSuccess: () => {
      setAmount('')
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
      if (withdrawalsData.data) setAllWithdrawals((prev) => [...prev, ...withdrawalsData.data])
    }
  }

  if (error && !withdrawalsData?.data) {
    return (
      <PageShell title="Claims">
        <ErrorState
          title="Failed to load claims"
          message="Could not fetch claim data."
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
      label: 'Receiver',
      render: (val: unknown) => <code className="defi-code">{String(val).slice(0, 10)}...</code>,
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (val: unknown) => {
        const variant =
          val === 'success' ? 'success' : val === 'processing' ? 'warning' : val === 'pending' ? 'info' : 'error'
        return <Badge label={String(val)} variant={variant} />
      },
    },
    {
      key: 'createdAt' as const,
      label: 'Date',
      render: (val: unknown) => new Date(val as string).toLocaleDateString('en-US'),
    },
  ]

  return (
    <PageShell title="Claims">
      <div className="space-y-6">
        <div className="defi-card p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 glow-text">Claim Rewards</h3>

          {submitSuccess && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-200 text-sm">
              Claim submitted successfully!
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-200 text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Amount (USD)</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="defi-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Receiver</label>
              <div className="defi-input flex items-center justify-between">
                <span className="font-mono text-sm">{receiver ? String(receiver) : '—'}</span>
                <span className="text-[10px] text-slate-400">Connected wallet</span>
              </div>
            </div>
          </div>

          <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="defi-btn-primary">
            {submitMutation.isPending ? 'Processing…' : 'Claim'}
          </button>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-4 glow-text">Claim History</h3>

          {isLoading && !displayWithdrawals.length ? (
            <Skeleton />
          ) : displayWithdrawals.length === 0 ? (
            <EmptyState icon="🧾" title="No claims" description="Your claim history will appear here." />
          ) : (
            <>
              <Table<Withdrawal> columns={columns} data={displayWithdrawals} />
              <Pagination hasMore={withdrawalsData?.hasMore || false} isLoading={isLoading} onLoadMore={handleLoadMore} />
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
