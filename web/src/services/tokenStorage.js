import { Preferences } from '@capacitor/preferences'

const KEYS = {
  access: 'sl_access_token',
  refresh: 'sl_refresh_token',
}

async function set(key, value) {
  try {
    await Preferences.set({ key, value })
  } catch {
    localStorage.setItem(key, value)
  }
}

async function get(key) {
  try {
    const { value } = await Preferences.get({ key })
    if (value != null) return value
  } catch {
    // fallback
  }
  return localStorage.getItem(key)
}

async function remove(key) {
  try {
    await Preferences.remove({ key })
  } catch {
    // ignore
  }
  localStorage.removeItem(key)
}

export const tokenStorage = {
  async setTokens({ accessToken, refreshToken }) {
    if (accessToken) await set(KEYS.access, accessToken)
    if (refreshToken) await set(KEYS.refresh, refreshToken)
  },
  async getAccessToken() { return get(KEYS.access) },
  async getRefreshToken() { return get(KEYS.refresh) },
  async clear() {
    await remove(KEYS.access)
    await remove(KEYS.refresh)
  },
}
