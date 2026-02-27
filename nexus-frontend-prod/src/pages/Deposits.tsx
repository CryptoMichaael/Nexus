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
import { Deposit } from '../lib/types'

export function Deposits() {
  const [cursor, setCursor] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([])

  const { data: depositsData, isLoading, error, refetch } = useQuery({
    queryKey: ['deposits', cursor, statusFilter, searchQuery],
    queryFn: () =>
      api.getDeposits(
        cursor,
        20,
        statusFilter || undefined,
        searchQuery || undefined
      ),
  })

  const handleLoadMore = () => {
    if (depositsData?.nextCursor) {
      setCursor(depositsData.nextCursor)
      if (depositsData.data) {
        setAllDeposits((prev) => [...prev, ...depositsData.data])
      }
    }
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    setCursor(undefined)
    setAllDeposits([])
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCursor(undefined)
    setAllDeposits([])
  }

  if (error) {
    return (
      <PageShell title="Deposits">
        <ErrorState
          title="Failed to load deposits"
          message="Could not fetch deposit data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  const displayDeposits = cursor ? allDeposits : depositsData?.data || []

  const columns = [
    {
      key: 'txHash' as const,
      label: 'TX Hash',
      render: (val: unknown) => (
        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
          {String(val).slice(0, 16)}...
        </code>
      ),
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
      key: 'status' as const,
      label: 'Status',
      render: (val: unknown) => {
        const variant =
          val === 'confirmed'
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
    <PageShell title="Deposits">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by TX hash..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && !displayDeposits.length ? (
          <Skeleton />
        ) : displayDeposits.length === 0 ? (
          <EmptyState
            icon="💾"
            title="No deposits"
            description="You haven't made any deposits yet."
          />
        ) : (
          <>
            <Table<Deposit> columns={columns} data={displayDeposits} />
            <Pagination
              hasMore={depositsData?.hasMore || false}
              isLoading={isLoading}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>
    </PageShell>
  )
}
