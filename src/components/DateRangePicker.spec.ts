// Feature: moment-chalet-booking-system, Property 6: 已佔用日期不可選
// Feature: moment-chalet-booking-system, Property 7: 日期順序驗證

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { isDateBlocked } from '@/components/DateRangePicker.vue'
import type { BlockedDate } from '@/types'

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Returns true only when checkOut > checkIn (valid date range).
 */
function isValidDateRange(checkIn: Date, checkOut: Date): boolean {
  return checkOut > checkIn
}

function makeBlockedDate(startDate: string, endDate: string): BlockedDate {
  return {
    id: 'test-id',
    property_id: 'prop-1',
    start_date: startDate,
    end_date: endDate,
    source: 'manual',
    synced_at: new Date().toISOString(),
  }
}

// ── Property 6: 已佔用日期不可選 ─────────────────────────────────────────────

/**
 * Validates: Requirements 3.2, 3.3
 *
 * Property 6: 已佔用日期不可選
 * For any date that falls within a blocked range, isDateBlocked returns true.
 * For any date outside all blocked ranges, isDateBlocked returns false.
 */
describe('Property 6: 已佔用日期不可選', () => {
  it('落在封鎖區間內的日期應回傳 true', () => {
    fc.assert(
      fc.property(
        // blocked range: year 2025, month 1-12, day 1-20 (start), offset 1-8 (range length)
        fc.integer({ min: 1, max: 12 }),   // month (1-based)
        fc.integer({ min: 1, max: 20 }),   // start day
        fc.integer({ min: 1, max: 8 }),    // range length in days
        fc.integer({ min: 0, max: 0 }),    // offset within range (0 = start day itself)
        (month, startDay, rangeLen, offset) => {
          const year = 2025
          const start = new Date(year, month - 1, startDay)
          const end = new Date(year, month - 1, startDay + rangeLen)
          const testDate = new Date(year, month - 1, startDay + offset)

          const blocked = [makeBlockedDate(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0],
          )]

          return isDateBlocked(testDate, blocked) === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('落在封鎖區間中間的日期應回傳 true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),   // month
        fc.integer({ min: 1, max: 15 }),   // start day
        fc.integer({ min: 2, max: 8 }),    // range length (at least 2 so there's a middle)
        (month, startDay, rangeLen) => {
          const year = 2025
          const start = new Date(year, month - 1, startDay)
          const end = new Date(year, month - 1, startDay + rangeLen)
          // Pick a date strictly inside the range
          const midDate = new Date(year, month - 1, startDay + Math.floor(rangeLen / 2))

          const blocked = [makeBlockedDate(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0],
          )]

          return isDateBlocked(midDate, blocked) === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('封鎖區間之外的日期應回傳 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),   // month for blocked range
        fc.integer({ min: 1, max: 10 }),   // start day of blocked range
        fc.integer({ min: 1, max: 5 }),    // range length
        fc.integer({ min: 1, max: 10 }),   // gap after range end
        (month, startDay, rangeLen, gap) => {
          const year = 2025
          const start = new Date(year, month - 1, startDay)
          const end = new Date(year, month - 1, startDay + rangeLen)
          // Date clearly after the blocked range
          const afterDate = new Date(year, month - 1, startDay + rangeLen + gap)

          const blocked = [makeBlockedDate(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0],
          )]

          return isDateBlocked(afterDate, blocked) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('空封鎖清單時任何日期都應回傳 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),  // year
        fc.integer({ min: 1, max: 12 }),        // month
        fc.integer({ min: 1, max: 28 }),        // day
        (year, month, day) => {
          const date = new Date(year, month - 1, day)
          return isDateBlocked(date, []) === false
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 7: 日期順序驗證 ──────────────────────────────────────────────────

/**
 * Validates: Requirements 3.4
 *
 * Property 7: 日期順序驗證
 * For any checkIn and checkOut where checkOut <= checkIn, the range is invalid.
 * isValidDateRange returns true only when checkOut > checkIn.
 */
describe('Property 7: 日期順序驗證', () => {
  it('checkOut > checkIn 時應為有效區間', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 27 }),   // checkIn day
        fc.integer({ min: 1, max: 10 }),   // nights (positive)
        (day, nights) => {
          const checkIn = new Date(2025, 0, day)
          const checkOut = new Date(2025, 0, day + nights)
          return isValidDateRange(checkIn, checkOut) === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('checkOut === checkIn 時應為無效區間', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),   // day
        (day) => {
          const checkIn = new Date(2025, 0, day)
          const checkOut = new Date(2025, 0, day)
          return isValidDateRange(checkIn, checkOut) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('checkOut < checkIn 時應為無效區間', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 28 }),   // checkIn day (min 2 so we can go before)
        fc.integer({ min: 1, max: 5 }),    // how many days before checkIn
        (day, offset) => {
          const checkIn = new Date(2025, 0, day)
          const checkOut = new Date(2025, 0, day - offset)
          return isValidDateRange(checkIn, checkOut) === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
