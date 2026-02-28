import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageShell } from '../components/layout/PageShell'
import { Pagination } from '../components/common/Pagination'
import { Skeleton } from '../components/common/Skeleton'
import { ErrorState } from '../components/common/ErrorState'
import { TreeNode as TreeNodeType } from '../lib/types'
import { api } from '../lib/api'

interface ExpandedNodeMap {
  [key: string]: boolean
}

function TreeNodeComponent({
  node,
  onToggle,
  isExpanded,
  children,
}: {
  node: TreeNodeType
  onToggle: () => void
  isExpanded: boolean
  children?: ReactNode
}) {
  return (
    <div className="mb-2">
      <div className="flex items-start gap-2 p-3 hover:bg-primary-600/5 rounded cursor-pointer group border border-primary-500/10">
        <button
          onClick={onToggle}
          className="text-primary-100 hover:text-primary-50 transition-colors flex-shrink-0 mt-1"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-100 truncate">{node.name}</p>
          <p className="text-xs text-slate-400 truncate">{node.userId}</p>
        </div>
      </div>
      {isExpanded && children ? (
        <div className="ml-4 border-l border-primary-500/20 pl-3 mt-2">{children}</div>
      ) : null}
    </div>
  )
}

function TreeNodeChildrenLoader({ parentId }: { parentId: string }) {
  const [cursor, setCursor] = useState<string | undefined>()
  const [loaded, setLoaded] = useState<TreeNodeType[]>([])
  const [expandedNodes, setExpandedNodes] = useState<ExpandedNodeMap>({})

  const { data, isLoading, error } = useQuery({
    queryKey: ['team', 'children', parentId, cursor],
    queryFn: () => api.getTreeChildren(parentId, cursor, 10),
  })

  const handleLoadMore = () => {
    if (data?.nextCursor) {
      setCursor(data.nextCursor)
      if (data.data) setLoaded((prev) => [...prev, ...data.data])
    }
  }

  const display = cursor ? loaded : data?.data || []

  if (error) {
    return (
      <div className="ml-4">
        <ErrorState title="Failed to load map" message="Could not fetch referral map nodes." />
      </div>
    )
  }

  if (isLoading && display.length === 0) {
    return (
      <div className="ml-4">
        <Skeleton />
      </div>
    )
  }

  return (
    <div>
      {display.map((child) => {
        const isExpanded = !!expandedNodes[child.userId]
        return (
          <TreeNodeComponent
            key={child.userId}
            node={child}
            isExpanded={isExpanded}
            onToggle={() =>
              setExpandedNodes((prev) => ({ ...prev, [child.userId]: !prev[child.userId] }))
            }
          >
            {isExpanded ? <TreeNodeChildrenLoader parentId={child.userId} /> : null}
          </TreeNodeComponent>
        )
      })}

      <Pagination hasMore={data?.hasMore || false} isLoading={isLoading} onLoadMore={handleLoadMore} />
    </div>
  )
}

export function Tree() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['team', 'root'],
    queryFn: () => api.getTreeRoot(),
  })

  if (error) {
    return (
      <PageShell title="Referral Map">
        <ErrorState
          title="Failed to load referral map"
          message="Could not fetch your referral map data."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  if (isLoading) {
    return (
      <PageShell title="Referral Map">
        <Skeleton />
      </PageShell>
    )
  }

  if (!data) {
    return (
      <PageShell title="Referral Map">
        <ErrorState title="No data" message="Referral map is unavailable." />
      </PageShell>
    )
  }

  return (
    <PageShell title="Referral Map">
      <div className="defi-card p-6">
        <div className="text-sm text-slate-300 mb-4">
          Expand nodes to explore your community structure.
        </div>
        <TreeNodeComponent node={data} isExpanded={true} onToggle={() => {}}>
          <TreeNodeChildrenLoader parentId={data.userId} />
        </TreeNodeComponent>
      </div>
    </PageShell>
  )
}
