import { apiBaseUrl } from '@/config'

const STATUS_PRESENTATION = {
  pendente: { label: 'Pendente', color: 'warning', icon: 'mdi-clock-outline' },
  confirmada: { label: 'Confirmada', color: 'success', icon: 'mdi-check-circle-outline' },
  rejeitada: { label: 'Rejeitada', color: 'error', icon: 'mdi-close-circle-outline' },
  cancelada: { label: 'Cancelada', color: 'surface-variant', icon: 'mdi-cancel' },
  concluida: { label: 'Concluída', color: 'primary', icon: 'mdi-star-outline' },
}

const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '')

export function serviceIcon (name) {
  const serviceName = String(name || '').toLocaleLowerCase('pt')
  if (serviceName.includes('pedicure')) {
    return 'mdi-foot-print'
  }
  if (serviceName.includes('manicure') || serviceName.includes('unha')) {
    return 'mdi-hand-heart-outline'
  }
  if (serviceName.includes('maquilh') || serviceName.includes('maqui')) {
    return 'mdi-face-woman-shimmer-outline'
  }
  return 'mdi-content-cut'
}

export function serviceImageUrl (imagePath) {
  if (!imagePath) {
    return undefined
  }
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath
  }
  return `${apiOrigin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
}

export function formatPrice (value) {
  return `${new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))} MZN`
}

export function formatDateTime (value) {
  const [date, time] = value.split(' ')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year} às ${time.slice(0, 5)}`
}

export function formatDate (value) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function salonDateTime (now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`
}

export function salonToday (now = new Date()) {
  return salonDateTime(now).slice(0, 10)
}

export function appointmentStatus (status) {
  return STATUS_PRESENTATION[status] ?? {
    label: status,
    color: 'surface-variant',
    icon: 'mdi-help-circle-outline',
  }
}
