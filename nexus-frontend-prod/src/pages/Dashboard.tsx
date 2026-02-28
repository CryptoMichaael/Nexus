import { useQuery } from '@tanstack/react-query'
import { PageShell } from '../components/layout/PageShell'
import { KpiCard } from '../components/common/KpiCard'
import { ErrorState } from '../components/common/ErrorState'
import { api } from '../lib/api'

export function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 30000,
  })

  if (error) {
    return (
      <PageShell title="Dashboard">
        <ErrorState
          title="Failed to load dashboard"
          message="Could not fetch your dashboard data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  return (
    <PageShell title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard label="Staked Balance" value={data?.walletBalance || 0} icon="🪙" loading={isLoading} />
        <KpiCard label="Rewards Earned" value={data?.totalEarned || 0} icon="✨" loading={isLoading} />
        <KpiCard label="Total Claimed" value={data?.totalWithdrawn || 0} icon="🧾" loading={isLoading} />
        <KpiCard label="Pending Claims" value={data?.pendingWithdrawals || 0} icon="⏳" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard label="Referral Network Size" value={data?.totalTeamSize || 0} icon="🧠" loading={isLoading} />
        <KpiCard label="Direct Invites" value={data?.directReferrals || 0} icon="🤝" loading={isLoading} />
        <KpiCard label="Total Staked Volume" value={data?.totalDepositVolume || 0} icon="🔒" loading={isLoading} />
      </div>
    </PageShell>
  )
}
