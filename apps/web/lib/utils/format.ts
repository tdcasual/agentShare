import type { Locale } from '../i18n-shared'

/**
 * Format a date to relative time (e.g., "5 minutes ago")
 */
export function formatTimeAgo(date: Date | string, locale: Locale = 'en'): string {
  const now = new Date()
  const past = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - past.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (locale === 'zh') {
    if (seconds < 10) return '刚刚'
    if (seconds < 60) return `${seconds}秒前`
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return past.toLocaleDateString('zh-CN')
  }
  
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return past.toLocaleDateString('en-US')
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * Generate a deterministic color based on a string
 */
export function getDeterministicColor(str: string): string {
  const colors = [
    'bg-slate-600',
    'bg-zinc-600',
    'bg-stone-600',
    'bg-neutral-600',
    'bg-gray-600',
    'bg-slate-700',
  ]
  
  const index = str 
    ? str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    : 0
  
  return colors[index]
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
