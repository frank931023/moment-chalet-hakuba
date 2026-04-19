// Feature: moment-chalet-booking-system
// Consolidated property tests for booking logic and date handling (Properties 5–8)

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { calculateBookingTotal } from '@/stores/booking'
import { isDateBlocked } from '@/utils/dateRangeUtils'
import { formatDate } from '@/utils/date'
import {
  FC_PARAMS,
  arbRoomType,
  arbBlockedDate,
  arbLocale,
} from './setup'

// ── Property 5: 含早餐金額計算正確性 ─────────────────────────────────────────

/**
 * Validates: Requirements 2.3
 *
 * Property 5: 含早餐金額計算正確性
 * For any valid room type and date range, the total with breakfast must equal
 * (pricePerNight + breakfastPrice) * nights, and without breakfast must equal
 * pricePerNight * nights.
 */
describe('Property 5: 含早餐金額計算正確性', () => {
  const arbCheckInOut = fc
    .date({ min: new Date('2024-01-01'), max: new Date('2026-11-30') })
    .chain((checkIn) =>
      fc.integer({ min: 1, max: 30 }).map((nights) => {
        const checkOut = new Date(checkIn)
        checkOut.setDate(checkOut.getDate() + nights)
        return { checkIn, checkOut, nights }
      })
    )

  it('含早餐總金額 = (每晚價格 + 早餐價格) × 晚數', () => {
    fc.assert(
      fc.property(arbRoomType, arbCheckInOut, (roomType, { checkIn, checkOut, nights }) => {
        const total = calculateBookingTotal({
          pricePerNight: roomType.price_per_night,
          breakfastPrice: roomType.breakfast_price,
          checkIn,
          checkOut,
          includeBreakfast: true,
        })
        const expected = (roomType.price_per_night + roomType.breakfast_price) * nights
        expect(total).toBeCloseTo(expected, 5)
      }),
      FC_PARAMS
    )
  })

  it('不含早餐總金額 = 每晚價格 × 晚數', () => {
    fc.assert(
      fc.property(arbRoomType, arbCheckInOut, (roomType, { checkIn, checkOut, nights }) => {
        const total = calculateBookingTotal({
          pricePerNight: roomType.price_per_night,
          breakfastPrice: roomType.breakfast_price,
          checkIn,
          checkOut,
          includeBreakfast: false,
        })
        const expected = roomType.price_per_night * nights
        expect(total).toBeCloseTo(expected, 5)
      }),
      FC_PARAMS
    )
  })

  it('含早餐金額 >= 不含早餐金額（早餐價格 >= 0）', () => {
    fc.assert(
      fc.property(arbRoomType, arbCheckInOut, (roomType, { checkIn, checkOut }) => {
        const withBreakfast = calculateBookingTotal({
          pricePerNight: roomType.price_per_night,
          breakfastPrice: roomType.breakfast_price,
          checkIn,
          checkOut,
          includeBreakfast: true,
        })
        const withoutBreakfast = calculateBookingTotal({
          pricePerNight: roomType.price_per_night,
          breakfastPrice: roomType.breakfast_price,
          checkIn,
          checkOut,
          includeBreakfast: false,
        })
        expect(withBreakfast).toBeGreaterThanOrEqual(withoutBreakfast)
      }),
      FC_PARAMS
    )
  })
})

// ── Property 6: 已佔用日期不可選 ─────────────────────────────────────────────

/**
 * Validates: Requirements 3.2, 3.3
 *
 * Property 6: 已佔用日期不可選
 * Any date that falls within a blocked range must be detected as blocked by
 * isDateBlocked. Dates outside all blocked ranges must not be blocked.
 */
describe('Property 6: 已佔用日期不可選', () => {
  it('封鎖區間的結束日應被標記為不可選', () => {
    fc.assert(
      fc.property(
        fc.array(arbBlockedDate, { minLength: 1, maxLength: 5 }),
        (blockedDates) => {
          // Use end_date parsed as UTC — same as isDateBlocked does
          const first = blockedDates[0]
          const endDate = new Date(first.end_date)

          expect(isDateBlocked(endDate, blockedDates)).toBe(true)
        }
      ),
      FC_PARAMS
    )
  })

  it('封鎖區間的起始日應被標記為不可選', () => {
    fc.assert(
      fc.property(
        fc.array(arbBlockedDate, { minLength: 1, maxLength: 5 }),
        (blockedDates) => {
          const first = blockedDates[0]
          const startDate = new Date(first.start_date)
          expect(isDateBlocked(startDate, blockedDates)).toBe(true)
        }
      ),
      FC_PARAMS
    )
  })

  it('早於所有封鎖區間的日期不應被標記為不可選', () => {
    fc.assert(
      fc.property(
        fc.array(arbBlockedDate, { minLength: 1, maxLength: 5 }),
        (blockedDates) => {
          // A date well before all blocked ranges
          const beforeAll = new Date('2020-01-01')
          expect(isDateBlocked(beforeAll, blockedDates)).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })

  it('空封鎖清單時任何日期均可選', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        (date) => {
          expect(isDateBlocked(date, [])).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 7: 日期順序驗證 ──────────────────────────────────────────────────

/**
 * Validates: Requirements 3.4
 *
 * Property 7: 日期順序驗證
 * calculateBookingTotal must return 0 when checkOut <= checkIn, confirming
 * that the system enforces checkOut > checkIn.
 */
describe('Property 7: 日期順序驗證', () => {
  it('checkOut <= checkIn 時金額應為 0', () => {
    fc.assert(
      fc.property(
        arbRoomType,
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        (roomType, date) => {
          // Same day: checkOut === checkIn
          const sameDayTotal = calculateBookingTotal({
            pricePerNight: roomType.price_per_night,
            breakfastPrice: roomType.breakfast_price,
            checkIn: date,
            checkOut: date,
            includeBreakfast: false,
          })
          expect(sameDayTotal).toBe(0)
        }
      ),
      FC_PARAMS
    )
  })

  it('checkOut 早於 checkIn 時金額應為 0', () => {
    fc.assert(
      fc.property(
        arbRoomType,
        fc.date({ min: new Date('2024-02-01'), max: new Date('2026-12-31') }),
        fc.integer({ min: 1, max: 30 }),
        (roomType, checkOut, daysBack) => {
          const checkIn = new Date(checkOut)
          checkIn.setDate(checkIn.getDate() + daysBack) // checkIn is after checkOut

          const total = calculateBookingTotal({
            pricePerNight: roomType.price_per_night,
            breakfastPrice: roomType.breakfast_price,
            checkIn,
            checkOut,
            includeBreakfast: false,
          })
          expect(total).toBe(0)
        }
      ),
      FC_PARAMS
    )
  })

  it('checkOut > checkIn 時金額應大於 0（價格 > 0）', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 50000, noNaN: true }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-11-30') }),
        fc.integer({ min: 1, max: 30 }),
        (pricePerNight, checkIn, nights) => {
          const checkOut = new Date(checkIn)
          checkOut.setDate(checkOut.getDate() + nights)

          const total = calculateBookingTotal({
            pricePerNight,
            breakfastPrice: 0,
            checkIn,
            checkOut,
            includeBreakfast: false,
          })
          expect(total).toBeGreaterThan(0)
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 8: 日期格式依語系調整 ───────────────────────────────────────────

/**
 * Validates: Requirements 3.5, 14.4
 *
 * Property 8: 日期格式依語系調整
 * formatDate must produce locale-specific formats:
 * - zh-TW: YYYY/MM/DD
 * - en:    MM/DD/YYYY
 * - ja:    YYYY年MM月DD日
 */
describe('Property 8: 日期格式依語系調整', () => {
  const arbDate = fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })

  it('zh-TW 格式應為 YYYY/MM/DD', () => {
    fc.assert(
      fc.property(arbDate, (date) => {
        const result = formatDate(date, 'zh-TW')
        expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
        const [yyyy, mm, dd] = result.split('/')
        expect(parseInt(yyyy)).toBe(date.getFullYear())
        expect(parseInt(mm)).toBe(date.getMonth() + 1)
        expect(parseInt(dd)).toBe(date.getDate())
      }),
      FC_PARAMS
    )
  })

  it('en 格式應為 MM/DD/YYYY', () => {
    fc.assert(
      fc.property(arbDate, (date) => {
        const result = formatDate(date, 'en')
        expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        const [mm, dd, yyyy] = result.split('/')
        expect(parseInt(yyyy)).toBe(date.getFullYear())
        expect(parseInt(mm)).toBe(date.getMonth() + 1)
        expect(parseInt(dd)).toBe(date.getDate())
      }),
      FC_PARAMS
    )
  })

  it('ja 格式應為 YYYY年MM月DD日', () => {
    fc.assert(
      fc.property(arbDate, (date) => {
        const result = formatDate(date, 'ja')
        expect(result).toMatch(/^\d{4}年\d{2}月\d{2}日$/)
        const yearMatch = result.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
        expect(yearMatch).not.toBeNull()
        if (yearMatch) {
          expect(parseInt(yearMatch[1])).toBe(date.getFullYear())
          expect(parseInt(yearMatch[2])).toBe(date.getMonth() + 1)
          expect(parseInt(yearMatch[3])).toBe(date.getDate())
        }
      }),
      FC_PARAMS
    )
  })

  it('不同語系產生不同格式（相同日期）', () => {
    fc.assert(
      fc.property(arbDate, (date) => {
        const zhTW = formatDate(date, 'zh-TW')
        const en = formatDate(date, 'en')
        const ja = formatDate(date, 'ja')

        // All three must be distinct strings
        const formats = new Set([zhTW, en, ja])
        expect(formats.size).toBe(3)
      }),
      FC_PARAMS
    )
  })

  it('任意語系格式化結果包含正確的年月日數值', () => {
    fc.assert(
      fc.property(arbDate, arbLocale, (date, locale) => {
        const result = formatDate(date, locale)
        const year = String(date.getFullYear())
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        expect(result).toContain(year)
        expect(result).toContain(month)
        expect(result).toContain(day)
      }),
      FC_PARAMS
    )
  })
})
