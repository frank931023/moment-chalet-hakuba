// Feature: moment-chalet-booking-system, Property 16: iCal 解析 Round-Trip

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { parseICalEvents, parseICalDate } from '../../utils/icalParser'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD date as iCal DATE value (YYYYMMDD) */
function toICalDate(date: string): string {
  return date.replace(/-/g, '')
}

/** Build a minimal iCal VCALENDAR string with a single VEVENT */
function buildICalText(dtstart: string, dtend: string): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Test//Test//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    'SUMMARY:Test Event',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a valid YYYY-MM-DD date string within a reasonable range */
const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // cap at 28 to avoid invalid dates
  })
  .map(({ year, month, day }) => {
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  })

/** Generate a pair of dates where start <= end */
const dateRangeArb = fc
  .tuple(dateArb, dateArb)
  .map(([a, b]) => (a <= b ? { start: a, end: b } : { start: b, end: a }))

// ─── Property 16: iCal 解析 Round-Trip ───────────────────────────────────────
// Validates: Requirements 8.2

describe('Property 16: iCal 解析 Round-Trip', () => {
  it('解析後的 start_date 應與原始 DTSTART 相符', () => {
    fc.assert(
      fc.property(dateRangeArb, ({ start, end }) => {
        const icalText = buildICalText(toICalDate(start), toICalDate(end))
        const events = parseICalEvents(icalText)
        expect(events).toHaveLength(1)
        expect(events[0].start_date).toBe(start)
      }),
      { numRuns: 100 }
    )
  })

  it('解析後的 end_date 應與原始 DTEND 相符', () => {
    fc.assert(
      fc.property(dateRangeArb, ({ start, end }) => {
        const icalText = buildICalText(toICalDate(start), toICalDate(end))
        const events = parseICalEvents(icalText)
        expect(events).toHaveLength(1)
        expect(events[0].end_date).toBe(end)
      }),
      { numRuns: 100 }
    )
  })

  it('parseICalDate 應正確將 YYYYMMDD 轉換為 YYYY-MM-DD', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const icalDateStr = toICalDate(date)
        const parsed = parseICalDate(icalDateStr)
        expect(parsed).toBe(date)
      }),
      { numRuns: 100 }
    )
  })

  it('parseICalDate 應正確處理 DATETIME 格式（含 T 與 Z）', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const icalDateStr = toICalDate(date) + 'T120000Z'
        const parsed = parseICalDate(icalDateStr)
        expect(parsed).toBe(date)
      }),
      { numRuns: 100 }
    )
  })

  it('多個 VEVENT 應全部被正確解析', () => {
    fc.assert(
      fc.property(fc.array(dateRangeArb, { minLength: 1, maxLength: 5 }), (ranges) => {
        const vevents = ranges
          .map(({ start, end }) =>
            [
              'BEGIN:VEVENT',
              `DTSTART;VALUE=DATE:${toICalDate(start)}`,
              `DTEND;VALUE=DATE:${toICalDate(end)}`,
              'SUMMARY:Test',
              'END:VEVENT',
            ].join('\r\n')
          )
          .join('\r\n')

        const icalText = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${vevents}\r\nEND:VCALENDAR`
        const events = parseICalEvents(icalText)

        expect(events).toHaveLength(ranges.length)
        events.forEach((event, i) => {
          expect(event.start_date).toBe(ranges[i].start)
          expect(event.end_date).toBe(ranges[i].end)
        })
      }),
      { numRuns: 100 }
    )
  })
})
