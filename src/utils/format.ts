const rtf = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' })

export function relativeTime(iso: string, now = Date.now()): string {
  const ageSeconds = Math.round((now - new Date(iso).getTime()) / 1000)
  return Math.abs(ageSeconds) < 86400 * 7 ? relativeAge(ageSeconds) : formatDate(iso)
}

/** Formats an age in seconds, e.g. 7200 → "2 hours ago". */
export function relativeAge(ageSeconds: number): string {
  const diffSeconds = -ageSeconds
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return 'Just now'
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour')
  return capitalise(rtf.format(Math.round(diffSeconds / 86400), 'day'))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function listJoin(items: string[], conjunction = 'and'): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
}

export function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${random}`
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1)
}
