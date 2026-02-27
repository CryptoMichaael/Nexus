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
      <div className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer group">
        <button
          onClick={onToggle}
          className="text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0 mt-1"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{node.name}</p>
          <p className="text-xs text-slate-500 truncate">{node.userId}</p>
        </div>
      </div>
      {isExpanded && children ? (
        <div className="ml-4 border-l border-slate-300 pl-2">{children}</div>
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

  const displayChildren = cursor ? loaded : data?.data || []

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  if (error) {
    return <div className="text-sm text-red-600 p-2">Failed to load children</div>
  }

  return (
    <>
      {displayChildren.map((child) => {
        const expanded = expandedNodes[child.id] || false
        return (
          <TreeNodeComponent
            key={child.id}
            node={child}
            isExpanded={expanded}
            onToggle={() => toggleNode(child.id)}
          >
            {expanded ? <TreeNodeChildrenLoader parentId={child.id} /> : null}
          </TreeNodeComponent>
        )
      })}

      <Pagination hasMore={data?.hasMore || false} isLoading={isLoading} onLoadMore={handleLoadMore} />
    </>
  )
}

export function Tree() {
  const [expandedRoot, setExpandedRoot] = useState(true)

  const { data: meData, isLoading, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    retry: false,
  })

  if (error) {
    return (
      <PageShell title="Tree View">
        <ErrorState
          title="Failed to load profile"
          message="Please login again and retry."
          onRetry={() => refetch()}
        />
      </PageShell>
    )
  }

  if (isLoading) {
    return (
      <PageShell title="Tree View">
        <Skeleton />
      </PageShell>
    )
  }

  const rootId = String(meData?.id || '')

  return (
    <PageShell title="Tree View">
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Click on nodes to expand and view their children.
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setExpandedRoot(!expandedRoot)}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              {expandedRoot ? '▼' : '▶'}
            </button>
            <span className="font-semibold text-slate-900">Your Network</span>
          </div>

          {expandedRoot && rootId ? (
            <div className="ml-2">
              <TreeNodeChildrenLoader parentId={rootId} />
            </div>
          ) : (
            <div className="text-sm text-slate-600">No root user found.</div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
