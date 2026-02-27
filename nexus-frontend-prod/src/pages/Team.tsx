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
import { TeamMember } from '../lib/types'

export function Team() {
  const [selectedLevel, setSelectedLevel] = useState<number | undefined>()
  const [cursor, setCursor] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [allMembers, setAllMembers] = useState<TeamMember[]>([])

  const { data: levels } = useQuery({
    queryKey: ['team', 'levels-summary'],
    queryFn: () => api.getLevelsSummary(),
  })

  const { data: membersData, isLoading, error, refetch } = useQuery({
    queryKey: ['team', 'members', selectedLevel, cursor, searchQuery],
    queryFn: () =>
      api.getTeamMembers(selectedLevel, cursor, 20, searchQuery || undefined),
    enabled: true,
  })

  const handleLoadMore = () => {
    if (membersData?.nextCursor) {
      setCursor(membersData.nextCursor)
      if (membersData.data) {
        setAllMembers((prev) => [...prev, ...membersData.data])
      }
    }
  }

  const handleLevelChange = (level: number | undefined) => {
    setSelectedLevel(level)
    setCursor(undefined)
    setAllMembers([])
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCursor(undefined)
    setAllMembers([])
  }

  if (error) {
    return (
      <PageShell title="Team">
        <ErrorState
          title="Failed to load team"
          message="Could not fetch team member data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  const displayMembers = cursor ? allMembers : membersData?.data || []

  const columns = [
    {
      key: 'userId' as const,
      label: 'User ID',
      width: '120px',
    },
    {
      key: 'name' as const,
      label: 'Name',
    },
    {
      key: 'level' as const,
      label: 'Level',
      render: (val: unknown) => (
        <Badge label={`Level ${val}`} variant="info" />
      ),
      width: '100px',
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (val: unknown) => {
        const variant =
          val === 'active'
            ? 'success'
            : val === 'inactive'
              ? 'warning'
              : 'error'
        return <Badge label={String(val)} variant={variant} />
      },
      width: '100px',
    },
    {
      key: 'volume' as const,
      label: 'Volume',
      render: (val: unknown) => `$${new Intl.NumberFormat('en-US').format(val as number)}`,
    },
    {
      key: 'rewardEarned' as const,
      label: 'Reward Earned',
      render: (val: unknown) => `$${new Intl.NumberFormat('en-US').format(val as number)}`,
    },
  ]

  return (
    <PageShell title="Team">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Level selector - dynamic from API */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter by Level
              </label>
              <select
                value={selectedLevel || ''}
                onChange={(e) =>
                  handleLevelChange(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              >
                <option value="">All Levels</option>
                {levels?.map((level) => (
                  <option key={level.level} value={level.level}>
                    Level {level.level} ({level.members} members)
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search User
              </label>
              <input
                type="text"
                placeholder="Search by userId or name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-primary-600"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && !displayMembers.length ? (
          <Skeleton />
        ) : displayMembers.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No members found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          <>
            <Table<TeamMember> columns={columns} data={displayMembers} />
            <Pagination
              hasMore={membersData?.hasMore || false}
              isLoading={isLoading}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>
    </PageShell>
  )
}
