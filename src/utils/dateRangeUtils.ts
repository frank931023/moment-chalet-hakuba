import type { BlockedDate } from '@/types'

/**
 * Pure helper: returns true if `date` falls within any blocked range.
 */
export function isDateBlocked(date: Date, blocked: BlockedDate[]): boolean {
  const d = date.getTime()
  for (const b of blocked) {
    const start = new Date(b.start_date).getTime()
    const end = new Date(b.end_date).getTime()
    if (d >= start && d <= end) return true
  }
  return false
}
