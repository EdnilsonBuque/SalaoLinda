import axios from 'axios'
import { apiBaseUrl } from '@/config'
import { tokenStorage } from './tokenStorage'

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise = null

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

async function doRefresh() {
  const refreshToken = await tokenStorage.getRefreshToken()
  if (!refreshToken) throw new Error('no refresh token')
  const res = await axios.post(`${apiBaseUrl}/auth/refresh`, { refreshToken })
  const { accessToken, refreshToken: newRefresh, user } = res.data
  await tokenStorage.setTokens({ accessToken, refreshToken: newRefresh })
  return { accessToken, user }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthPath = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register') || original?.url?.includes('/auth/refresh')
    if (status === 401 && original && !original._retry && !isAuthPath) {
      original._retry = true
      try {
        if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
        const { accessToken } = await refreshPromise
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch (e) {
        await tokenStorage.clear()
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)

export default api
