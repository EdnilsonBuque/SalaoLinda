import { defineStore } from 'pinia'
import api from '@/services/api'
import { tokenStorage } from '@/services/tokenStorage'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'admin',
  },
  actions: {
    async hydrate() {
      try {
        const access = await tokenStorage.getAccessToken()
        if (!access) { this.user = null; return }
        const { data } = await api.get('/auth/me')
        this.user = data.user
      } catch {
        await tokenStorage.clear()
        this.user = null
      } finally {
        this.ready = true
      }
    },
    async register(payload) {
      const { data } = await api.post('/auth/register', payload)
      await tokenStorage.setTokens(data)
      this.user = data.user
      return data.user
    },
    async login(payload) {
      const { data } = await api.post('/auth/login', payload)
      await tokenStorage.setTokens(data)
      this.user = data.user
      return data.user
    },
    async logout() {
      try {
        const refreshToken = await tokenStorage.getRefreshToken()
        if (refreshToken) await api.post('/auth/logout', { refreshToken })
      } catch {
        // ignore
      }
      await tokenStorage.clear()
      this.user = null
    },
    setUser(user) { this.user = user },
  },
})
