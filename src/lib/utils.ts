import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, addMinutes } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(isoString: string, _timezone: string = 'America/New_York'): string {
  return format(parseISO(isoString), 'EEE, MMM d · h:mm a')
}

export function formatTime(isoString: string, _timezone: string = 'America/New_York'): string {
  return format(parseISO(isoString), 'h:mm a')
}

export function formatDate(isoString: string): string {
  return format(parseISO(isoString), 'EEE, MMM d, yyyy')
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function generateShareToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slotEndTime(startIso: string, durationMinutes: number): string {
  return addMinutes(parseISO(startIso), durationMinutes).toISOString()
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}
