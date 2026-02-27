const TOKEN_KEY = 'nexus_auth_token'
const USER_KEY = 'nexus_user'

export const auth = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || 
           import.meta.env.VITE_AUTH_TOKEN || 
           null
  },

  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
  },

  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY)
  },

  getUser: () => {
    try {
      const user = localStorage.getItem(USER_KEY)
      return user ? JSON.parse(user) : null
    } catch {
      return null
    }
  },

  setUser: (user: unknown) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clearUser: () => {
    localStorage.removeItem(USER_KEY)
  },

  logout: () => {
    auth.clearToken()
    auth.clearUser()
  },

  isAuthenticated: (): boolean => {
    return !!auth.getToken()
  },
}
