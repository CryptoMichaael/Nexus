import axios, { AxiosInstance } from 'axios'
import { auth } from './auth'

const baseURL = import.meta.env.VITE_API_URL

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = auth.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

type UserRole = 'USER' | 'ADMIN'

type WalletNonceResponse = {
  nonce: string
  messageToSign: string
  issuedAt: string
}

type WalletVerifyResponse = {
  token: string
  user: { id: string; address: string; role: UserRole }
}

type MeResponse = { id: string; address: string; role: UserRole }

export async function walletNonce(address: string, domain: string): Promise<WalletNonceResponse> {
  const res = await apiClient.post('/v1/auth/wallet/nonce', { address, domain })
  return res.data as WalletNonceResponse
}

export async function walletVerify(
  address: string,
  signature: string,
  domain: string,
  issuedAt: string
): Promise<WalletVerifyResponse> {
  const res = await apiClient.post('/v1/auth/wallet/verify', { address, signature, domain, issuedAt })
  return res.data as WalletVerifyResponse
}

export async function me(): Promise<MeResponse> {
  const res = await apiClient.get('/v1/auth/me')
  return res.data as MeResponse
}

export function adminGetUsers() {
  return apiClient.get('/v1/admin/users')
}

export function adminAdjustLedger(userId: string, token: string, amount: number | string, reason?: string) {
  return apiClient.post('/v1/admin/ledger/adjust', { userId, token, amount, reason })
}

export function adminGetWithdrawals() {
  return apiClient.get('/v1/withdrawals')
}
