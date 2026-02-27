import { useQuery } from '@tanstack/react-query'
import { PageShell } from '../components/layout/PageShell'
import { Table } from '../components/common/Table'
import { Badge } from '../components/common/Badge'
import { ErrorState } from '../components/common/ErrorState'
import { Skeleton } from '../components/common/Skeleton'
import { EmptyState } from '../components/common/EmptyState'
import { api } from '../lib/api'
import { LevelSummary } from '../lib/types'

export function NetworkOverview() {
  const { data: levels, isLoading, error, refetch } = useQuery({
    queryKey: ['team', 'levels-summary'],
    queryFn: () => api.getLevelsSummary(),
  })

  if (error) {
    return (
      <PageShell title="Network Overview">
        <ErrorState
          title="Failed to load levels"
          message="Could not fetch level summary data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  if (isLoading) {
    return (
      <PageShell title="Network Overview">
        <Skeleton />
      </PageShell>
    )
  }

  if (!levels || levels.length === 0) {
    return (
      <PageShell title="Network Overview">
        <EmptyState
          icon="👥"
          title="No level data"
          description="Your network doesn't have any level information yet."
        />
      </PageShell>
    )
  }

  const columns = [
    {
      key: 'level' as const,
      label: 'Level',
      render: (val: unknown) => (
        <Badge label={`Level ${String(val)}`} variant="info" />
      ),
      width: '100px',
    },
    {
      key: 'members' as const,
      label: 'Members',
      render: (val: unknown) => (
        <span className="font-semibold">{String(val)}</span>
      ),
    },
    {
      key: 'totalVolume' as const,
      label: 'Total Volume',
      render: (val: unknown) => `$${new Intl.NumberFormat('en-US').format(val as number)}`,
    },
    {
      key: 'totalReward' as const,
      label: 'Total Reward',
      render: (val: unknown) => `$${new Intl.NumberFormat('en-US').format(val as number)}`,
    },
  ]

  return (
    <PageShell title="Network Overview">
      <div className="mb-4">
        <p className="text-slate-600">
          Showing {levels.length} dynamic level(s) from backend.
        </p>
      </div>
      <Table<LevelSummary>
        columns={columns}
        data={levels}
        keyField="level"
      />
    </PageShell>
  )
}
