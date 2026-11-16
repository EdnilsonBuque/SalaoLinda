const baseUrl = import.meta.env.VITE_API_BASE_URL

if (!baseUrl || String(baseUrl).trim() === '') {
  throw new Error('VITE_API_BASE_URL em falta. Defina no ficheiro web/.env para evitar builds/APK apontados para localhost por engano.')
}

export const apiBaseUrl = String(baseUrl).replace(/\/$/, '')
