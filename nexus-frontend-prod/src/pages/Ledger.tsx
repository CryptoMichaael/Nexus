import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageShell } from '../components/layout/PageShell'
import { Table } from '../components/common/Table'
import { Badge } from '../components/common/Badge'
import { Pagination } from '../components/common/Pagination'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { Skeleton } from '../components/common/Skeleton'
import { api } from '../lib/api'
import { LedgerEntry } from '../lib/types'

export function Ledger() {
  const [cursor, setCursor] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([])

  const { data: ledgerData, isLoading, error, refetch } = useQuery({
    queryKey: ['ledger', cursor, typeFilter, statusFilter],
    queryFn: () =>
      api.getLedger(
        cursor,
        20,
        typeFilter || undefined,
        statusFilter || undefined
      ),
  })

  const handleLoadMore = () => {
    if (ledgerData?.nextCursor) {
      setCursor(ledgerData.nextCursor)
      if (ledgerData.data) {
        setAllEntries((prev) => [...prev, ...ledgerData.data])
      }
    }
  }

  const handleTypeChange = (type: string) => {
    setTypeFilter(type)
    setCursor(undefined)
    setAllEntries([])
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    setCursor(undefined)
    setAllEntries([])
  }

  if (error) {
    return (
      <PageShell title="Ledger">
        <ErrorState
          title="Failed to load ledger"
          message="Could not fetch ledger data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  const displayEntries = cursor ? allEntries : ledgerData?.data || []

  const columns = [
    {
      key: 'type' as const,
      label: 'Type',
      render: (val: unknown) => {
        const variantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
          reward: 'success',
          deposit: 'info',
          withdrawal: 'warning',
          adjustment: 'default',
        }
        const key = String(val)
        const variant = variantMap[key] || 'default'
        return <Badge label={key} variant={variant} />
      },
    },
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
      key: 'description' as const,
      label: 'Description',
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (val: unknown) => {
        const variant =
          val === 'completed'
            ? 'success'
            : val === 'pending'
              ? 'warning'
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
    <PageShell title="Ledger">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              >
                <option value="">All Types</option>
                <option value="reward">Reward</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && !displayEntries.length ? (
          <Skeleton />
        ) : displayEntries.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No ledger entries"
            description="Your ledger is empty."
          />
        ) : (
          <>
            <Table<LedgerEntry> columns={columns} data={displayEntries} />
            <Pagination
              hasMore={ledgerData?.hasMore || false}
              isLoading={isLoading}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>
    </PageShell>
  )
}
