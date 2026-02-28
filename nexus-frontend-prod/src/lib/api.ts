import axios, { AxiosInstance } from 'axios'
import {
  DashboardSummary,
  LevelSummary,
  CursorPaginationResponse,
  TeamMember,
  TreeNode,
  Deposit,
  LedgerEntry,
  Withdrawal,
} from './types'
import { auth } from './auth'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const API_URL = import.meta.env.VITE_API_URL

let axiosInstance: AxiosInstance | null = null

function getAxios(): AxiosInstance {
  if (axiosInstance) return axiosInstance

  axiosInstance = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  })

  axiosInstance.interceptors.request.use((config) => {
    const token = auth.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  return axiosInstance
}

type UserRole = 'USER' | 'ADMIN'

type WalletNonceResponse = { nonce: string; messageToSign: string; issuedAt: string }

type WalletVerifyResponse = {
  token: string
  user: { id: string; address: string; role: UserRole }
}

type MeResponse = { id: string; address: string; role: UserRole }

function toCursorResponse<T>(items: T[], nextCursor: string | null, limit: number): CursorPaginationResponse<T> {
  return {
    data: items,
    nextCursor,
    hasMore: Boolean(nextCursor),
    limit,
  }
}

function shorten(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

async function walletNonce(address: string, domain: string): Promise<WalletNonceResponse> {
  const res = await getAxios().post('/v1/auth/wallet/nonce', { address, domain })
  return res.data as WalletNonceResponse
}

async function walletVerify(address: string, signature: string, domain: string, issuedAt: string): Promise<WalletVerifyResponse> {
  const res = await getAxios().post('/v1/auth/wallet/verify', { address, signature, domain, issuedAt })
  return res.data as WalletVerifyResponse
}

async function me(): Promise<MeResponse> {
  const res = await getAxios().get('/v1/auth/me')
  return res.data as MeResponse
}

function mockCursor<T>(data: T[], limit: number): CursorPaginationResponse<T> {
  return { data, nextCursor: null, hasMore: false, limit }
}

export const api = {
  // Auth
  walletNonce,
  walletVerify,
  me: async () => {
    if (USE_MOCKS) {
      const u = auth.getUser()
      if (!u) throw new Error('Not authenticated')
      return u
    }
    return await me()
  },

  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    if (USE_MOCKS) {
      return {
        walletBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0,
        totalTeamSize: 0,
        directReferrals: 0,
        totalDepositVolume: 0,
      }
    }
    const res = await getAxios().get('/v1/dashboard/summary')
    return res.data as DashboardSummary
  },

  // Levels
  getLevelsSummary: async (): Promise<LevelSummary[]> => {
    if (USE_MOCKS) return []
    const res = await getAxios().get('/v1/team/levels-summary')
    const rows = (res.data as Array<{ level: number; members: number }>).map((r) => ({
      level: r.level,
      members: r.members,
      totalReward: 0,
      totalVolume: 0,
    }))
    return rows
  },

  // Team members
  getTeamMembers: async (
    level?: number,
    cursor?: string,
    limit: number = 20,
    query?: string
  ): Promise<CursorPaginationResponse<TeamMember>> => {
    if (USE_MOCKS) return mockCursor([], limit)

    const params = new URLSearchParams()
    if (level) params.append('level', String(level))
    if (cursor) params.append('cursor', cursor)
    params.append('limit', String(limit))
    if (query) params.append('q', query)

    const res = await getAxios().get(`/v1/team/members?${params.toString()}`)
    const payload = res.data as { items: any[]; nextCursor: string | null }

    const mapped: TeamMember[] = (payload.items || []).map((u: any) => {
      const addr = String(u.wallet_address || '')
      return {
        id: String(u.id),
        userId: addr,
        name: addr ? shorten(addr) : String(u.id),
        level: level || 1,
        joinedAt: String(u.created_at || new Date().toISOString()),
        status: 'active',
        volume: 0,
        rewardEarned: 0,
      }
    })

    return toCursorResponse(mapped, payload.nextCursor || null, limit)
  },

  // Tree root
  getTreeRoot: async (): Promise<TreeNode> => {
    const u = USE_MOCKS ? auth.getUser() : await me()
    if (!u) throw new Error('Not authenticated')

    const addr = String((u as any).address || '')
    return {
      id: String((u as any).id || addr),
      userId: addr || String((u as any).id),
      name: addr ? shorten(addr) : String((u as any).id),
      children: [],
      volume: 0,
      rewardEarned: 0,
    }
  },

  // Tree children
  getTreeChildren: async (
    parentId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<CursorPaginationResponse<TreeNode>> => {
    if (USE_MOCKS) return mockCursor([], limit)

    const params = new URLSearchParams()
    params.append('parentId', parentId)
    if (cursor) params.append('cursor', cursor)
    params.append('limit', String(limit))

    const res = await getAxios().get(`/v1/team/children?${params.toString()}`)
    const payload = res.data as { items: any[]; nextCursor: string | null }

    const mapped: TreeNode[] = (payload.items || []).map((u: any) => {
      const addr = String(u.wallet_address || '')
      return {
        id: String(u.id),
        userId: addr,
        name: addr ? shorten(addr) : String(u.id),
        children: [],
        volume: 0,
        rewardEarned: 0,
      }
    })

    return toCursorResponse(mapped, payload.nextCursor || null, limit)
  },

  // Deposits
  getDeposits: async (
    cursor?: string,
    limit: number = 20,
    status?: string,
    query?: string
  ): Promise<CursorPaginationResponse<Deposit>> => {
    if (USE_MOCKS) return mockCursor([], limit)

    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    params.append('limit', String(limit))
    if (status) params.append('status', status)
    if (query) params.append('q', query)

    const res = await getAxios().get(`/v1/deposits?${params.toString()}`)
    const payload = res.data as { items: any[]; nextCursor: string | null }

    const mapped: Deposit[] = (payload.items || []).map((d: any) => {
      const rawStatus = String(d.status || '').toUpperCase()
      const mappedStatus: Deposit['status'] =
        rawStatus === 'SUCCESS' ? 'confirmed' : rawStatus === 'FAILED' ? 'failed' : 'pending'

      return {
        id: String(d.id),
        userId: String(d.user_id),
        txHash: String(d.tx_hash || d.txHash || ''),
        amount: Number(d.amount) || 0,
        status: mappedStatus,
        createdAt: String(d.created_at || new Date().toISOString()),
      }
    })

    return toCursorResponse(mapped, payload.nextCursor || null, limit)
  },

  // Ledger (backend user ledger route not available; show empty list)
  getLedger: async (
    _cursor?: string,
    limit: number = 20,
    _type?: string,
    _status?: string,
    _query?: string
  ): Promise<CursorPaginationResponse<LedgerEntry>> => {
    if (USE_MOCKS) return mockCursor([], limit)
    return toCursorResponse([], null, limit)
  },

  // Withdrawals
  getWithdrawals: async (
    cursor?: string,
    limit: number = 20,
    status?: string
  ): Promise<CursorPaginationResponse<Withdrawal>> => {
    if (USE_MOCKS) return mockCursor([], limit)

    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    params.append('limit', String(limit))
    if (status) params.append('status', status)

    const res = await getAxios().get(`/v1/withdrawals?${params.toString()}`)
    const payload = res.data as { items: any[]; nextCursor: string | null }

    const mapped: Withdrawal[] = (payload.items || []).map((w: any) => {
      const rawStatus = String(w.status || '').toUpperCase()
      const mappedStatus: Withdrawal['status'] =
        rawStatus === 'SUCCESS'
          ? 'success'
          : rawStatus === 'PROCESSING'
            ? 'processing'
            : rawStatus === 'FAILED'
              ? 'failed'
              : 'pending'

      return {
        id: String(w.id),
        userId: String(w.user_id),
        amount: Number(w.amount) || 0,
        address: String(w.to_address || w.address || ''),
        txHash: w.tx_hash ? String(w.tx_hash) : undefined,
        status: mappedStatus,
        createdAt: String(w.created_at || new Date().toISOString()),
        processedAt: w.processed_at ? String(w.processed_at) : undefined,
        failureReason: w.error ? String(w.error) : undefined,
      }
    })

    return toCursorResponse(mapped, payload.nextCursor || null, limit)
  },

  submitWithdrawal: async (amount: number, address: string): Promise<{ ok: true; id: string }> => {
    const res = await getAxios().post('/v1/withdrawals', {
      token: 'USDT',
      amount: String(amount),
      toAddress: address,
    })
    return res.data as { ok: true; id: string }
  },

  // ROI Status
  get: async (endpoint: string) => {
    const res = await getAxios().get(endpoint)
    return res
  },
}
