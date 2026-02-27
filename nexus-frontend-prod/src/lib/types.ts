export interface User {
  id: string
  userId: string
  name: string
  email: string
  walletAddress: string
  referrerId?: string
  status: 'active' | 'inactive' | 'suspended'
  joinedAt: string
  createdAt: string
  updatedAt: string
}

export interface LevelSummary {
  level: number
  members: number
  totalReward: number
  totalVolume: number
}

export interface TeamMember {
  id: string
  userId: string
  name: string
  level: number
  joinedAt: string
  status: 'active' | 'inactive' | 'suspended'
  volume: number
  rewardEarned: number
}

export interface TreeNode {
  id: string
  userId: string
  name: string
  children: TreeNode[]
  volume: number
  rewardEarned: number
}

export interface Deposit {
  id: string
  userId: string
  txHash: string
  amount: number
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
}

export interface LedgerEntry {
  id: string
  userId: string
  type: 'reward' | 'deposit' | 'withdrawal' | 'adjustment'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  description: string
  createdAt: string
  completedAt?: string
}

export interface Withdrawal {
  id: string
  userId: string
  amount: number
  address: string
  txHash?: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  createdAt: string
  processedAt?: string
  failureReason?: string
}

export interface DashboardSummary {
  walletBalance: number
  totalEarned: number
  totalWithdrawn: number
  pendingWithdrawals: number
  totalTeamSize: number
  directReferrals: number
  totalDepositVolume: number
}

export interface CursorPaginationResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  limit: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
