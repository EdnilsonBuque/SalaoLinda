import { Capacitor } from '@capacitor/core'

const baseUrl = import.meta.env.VITE_API_BASE_URL

if (!baseUrl || String(baseUrl).trim() === '') {
  throw new Error('VITE_API_BASE_URL em falta. Defina no ficheiro web/.env para evitar builds/APK apontados para localhost por engano.')
}

export const apiBaseUrl = String(baseUrl).replace(/\/$/, '')

const parsedBaseUrl = new URL(apiBaseUrl)
const isAndroidBuild = import.meta.env.MODE === 'android'
const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedBaseUrl.hostname)

// Allow HTTP for Android development using 10.0.2.2 (special Android address that routes to development host)
// For production, require HTTPS; for development with 10.0.2.2, allow HTTP
const isAndroidDevLocalhost = isAndroidBuild && parsedBaseUrl.hostname === '10.0.2.2'

// Apenas exige HTTPS se não for 10.0.2.2 (desenvolvimento Android local)
// Se for 10.0.2.2, permite HTTP para desenvolvimento
const requiresHttps = isAndroidBuild && !isAndroidDevLocalhost

if ((isAndroidBuild || Capacitor.isNativePlatform()) && requiresHttps && (parsedBaseUrl.protocol !== 'https:' || isLocalHost)) {
  throw new Error('A app Android exige uma API pública com HTTPS. Configure VITE_API_BASE_URL em web/.env.android.')
}