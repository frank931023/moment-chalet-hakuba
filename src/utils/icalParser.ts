/**
 * Pure iCal parsing utilities extracted from supabase/functions/ical/sync/index.ts
 */

export interface ICalEvent {
  start_date: string
  end_date: string
}

/**
 * Convert iCal date string to YYYY-MM-DD.
 * Handles both DATE (YYYYMMDD) and DATETIME (YYYYMMDDTHHmmssZ) formats.
 */
export function parseICalDate(value: string): string {
  // Strip timezone suffix if present
  const clean = value.replace(/Z$/, '').split('T')[0]
  // clean is now YYYYMMDD
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  // Already in YYYY-MM-DD format
  return clean
}

/**
 * Parse iCal text and extract VEVENT date ranges.
 * Returns array of { start_date, end_date } in YYYY-MM-DD format.
 */
export function parseICalEvents(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = []
  const lines = icalText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let inEvent = false
  let dtstart: string | null = null
  let dtend: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      dtstart = null
      dtend = null
      continue
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && dtstart && dtend) {
        events.push({ start_date: dtstart, end_date: dtend })
      }
      inEvent = false
      continue
    }

    if (!inEvent) continue

    // DTSTART can be DTSTART, DTSTART;VALUE=DATE, DTSTART;TZID=...
    if (trimmed.startsWith('DTSTART')) {
      const value = trimmed.split(':').slice(1).join(':')
      dtstart = parseICalDate(value)
    } else if (trimmed.startsWith('DTEND')) {
      const value = trimmed.split(':').slice(1).join(':')
      dtend = parseICalDate(value)
    }
  }

  return events
}
