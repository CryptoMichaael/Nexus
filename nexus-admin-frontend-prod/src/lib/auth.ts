// Auth utilities for admin frontend (wallet login)
// supports both token-based and dev bypass modes

const TOKEN_KEY = 'nexus_admin_token'
const USER_KEY = 'nexus_admin_user'
const BYPASS_KEY = 'nexus_admin_bypass'

export interface User {
  id: string
  address: string
  role: 'USER' | 'ADMIN'
}

export const auth = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || null
  },
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY)
  },
  getUser: (): User | null => {
    try {
      const u = localStorage.getItem(USER_KEY)
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  },
  setUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clearUser: () => {
    localStorage.removeItem(USER_KEY)
  },
  logout: () => {
    auth.clearToken()
    auth.clearUser()
    auth.clearBypass()
  },
  isAuthenticated: (): boolean => {
    return !!auth.getToken() || auth.isBypassEnabled()
  },
  setBypass: (enabled: boolean) => {
    if (enabled) {
      localStorage.setItem(BYPASS_KEY, 'true')
    } else {
      localStorage.removeItem(BYPASS_KEY)
    }
  },
  isBypassEnabled: (): boolean => {
    return localStorage.getItem(BYPASS_KEY) === 'true'
  },
  clearBypass: () => {
    localStorage.removeItem(BYPASS_KEY)
  },
}

export function getUser(): User | null {
  return auth.getUser()
}

export function isAuthenticated(): boolean {
  return auth.isAuthenticated()
}

export function logout() {
  auth.logout()
}
