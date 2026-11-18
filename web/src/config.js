import { Capacitor } from '@capacitor/core'

const baseUrl = import.meta.env.VITE_API_BASE_URL

if (!baseUrl || String(baseUrl).trim() === '') {
  throw new Error('VITE_API_BASE_URL em falta. Defina no ficheiro web/.env para evitar builds/APK apontados para localhost por engano.')
}

export const apiBaseUrl = String(baseUrl).replace(/\/$/, '')

const parsedBaseUrl = new URL(apiBaseUrl)
const isAndroidBuild = import.meta.env.MODE === 'android'

// No Android, sempre exige HTTPS. Sem exceções para 10.0.2.2.
// O Android 15 bloqueia tráfego cleartext por padrão.
const requiresHttps = isAndroidBuild

if ((isAndroidBuild || Capacitor.isNativePlatform()) && requiresHttps && (parsedBaseUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedBaseUrl.hostname))) {
  throw new Error('A app Android exige uma API pública com HTTPS. Configure VITE_API_BASE_URL em web/.env.android.')
}
