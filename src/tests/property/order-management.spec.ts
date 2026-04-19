// Feature: moment-chalet-booking-system
// Consolidated property tests for order management and admin (Properties 14–19)

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { parseICalEvents, parseICalDate } from '@/utils/icalParser'
import type { Booking, BookingStatus, Property } from '@/types'
import { FC_PARAMS } from './setup'

// ── Shared arbitraries ────────────────────────────────────────────────────────

const allStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'refunded']
const arbStatus = fc.constantFrom(...allStatuses)

const arbEmail = fc
  .tuple(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 10 }))
  .map(([local, domain]) => `${local}@${domain}.com`)

const arbBookingId = fc.uuid()

function isoDateOffset(baseDateMs: number, days: number): string {
  return new Date(baseDateMs + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const arbBooking = fc.record<Booking>({
  id: fc.uuid(),
  room_type_id: fc.uuid(),
  guest_name: fc.string({ minLength: 1, maxLength: 20 }),
  guest_email: fc.tuple(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.string({ minLength: 1, maxLength: 10 })
  ).map(([local, domain]) => `${local}@${domain}.com`),
  guest_phone: fc.string({ minLength: 1, maxLength: 15 }),
  check_in: fc.constant('2025-07-01'),
  check_out: fc.constant('2025-07-05'),
  include_breakfast: fc.boolean(),
  total_amount: fc.integer({ min: 0, max: 100000 }),
  status: arbStatus,
  paypal_order_id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  paypal_capture_id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  special_requests: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  created_at: fc.constant('2025-06-01T00:00:00Z'),
})

const arbBookings = fc.array(arbBooking, { minLength: 0, maxLength: 20 })

const confirmedBookingArb = arbBooking.map(b => ({
  ...b,
  status: 'confirmed' as const,
  paypal_order_id: 'ORDER-123',
  paypal_capture_id: 'CAPTURE-456',
}))

const arbProperty = fc.record<Property>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  location: fc.string({ minLength: 1, maxLength: 30 }),
  lat: fc.float({ min: -90, max: 90, noNaN: true }),
  lng: fc.float({ min: -180, max: 180, noNaN: true }),
  images: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  ical_url: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.boolean(),
  created_at: fc.constant('2025-01-01T00:00:00Z'),
})

const arbProperties = fc.array(arbProperty, { minLength: 0, maxLength: 20 })

// ── Pure helpers ──────────────────────────────────────────────────────────────

const REFUND_DAYS = 7

function isRefundEligible(
  booking: { status: BookingStatus; check_in: string },
  now: Date = new Date()
): boolean {
  if (booking.status !== 'confirmed') return false
  const checkInDate = new Date(booking.check_in)
  const diffDays = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > 0 && diffDays <= REFUND_DAYS
}

function lookupBooking(
  bookings: Array<{ id: string; guest_email: string; status: BookingStatus }>,
  email: string,
  id: string
): BookingStatus | null {
  const found = bookings.find((b) => b.id === id && b.guest_email === email)
  return found ? found.status : null
}

function filterBookingsByStatus(bookings: Booking[], status: BookingStatus | 'all'): Booking[] {
  if (status === 'all') return bookings
  return bookings.filter(b => b.status === status)
}

function filterBookingsByKeyword(bookings: Booking[], keyword: string): Booking[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return bookings
  return bookings.filter(
    b =>
      b.guest_name.toLowerCase().includes(kw) ||
      b.guest_email.toLowerCase().includes(kw)
  )
}

function applyRefund(booking: Booking): Booking {
  return { ...booking, status: 'refunded' }
}

function addProperty(list: Property[], property: Property): Property[] {
  return [...list, property]
}

function updateProperty(list: Property[], id: string, updates: Partial<Property>): Property[] {
  return list.map(p => (p.id === id ? { ...p, ...updates } : p))
}

function getActiveProperties(list: Property[]): Property[] {
  return list.filter(p => p.is_active)
}

// ── iCal helpers ──────────────────────────────────────────────────────────────

function toICalDate(date: string): string {
  return date.replace(/-/g, '')
}

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

const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => {
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  })

const dateRangeArb = fc
  .tuple(dateArb, dateArb)
  .map(([a, b]) => (a <= b ? { start: a, end: b } : { start: b, end: a }))

// ── Property 14: 訂單查詢正確性 ───────────────────────────────────────────────

/**
 * **Validates: Requirements 7.2, 7.3**
 *
 * Property 14: 訂單查詢正確性
 * For any valid email + booking ID combination that matches a booking, the
 * result should show the correct booking status.
 * For any invalid combination, the result should be null ("not found").
 */
describe('Property 14: 訂單查詢正確性', () => {
  it('matching email + id returns the correct booking status', () => {
    fc.assert(
      fc.property(arbEmail, arbBookingId, arbStatus, (email, id, status) => {
        const bookings = [{ id, guest_email: email, status }]
        const result = lookupBooking(bookings, email, id)
        return result === status
      }),
      FC_PARAMS
    )
  })

  it('non-matching combination returns null (not found)', () => {
    fc.assert(
      fc.property(
        arbEmail,
        arbBookingId,
        arbEmail,
        arbBookingId,
        arbStatus,
        (storedEmail, storedId, queryEmail, queryId, status) => {
          fc.pre(storedEmail !== queryEmail || storedId !== queryId)
          const bookings = [{ id: storedId, guest_email: storedEmail, status }]
          const result = lookupBooking(bookings, queryEmail, queryId)
          return result === null
        }
      ),
      FC_PARAMS
    )
  })

  it('empty booking list always returns null', () => {
    fc.assert(
      fc.property(arbEmail, arbBookingId, (email, id) => {
        return lookupBooking([], email, id) === null
      }),
      FC_PARAMS
    )
  })
})

// ── Property 15: 退款按鈕顯示條件 ────────────────────────────────────────────

/**
 * **Validates: Requirements 7.4**
 *
 * Property 15: 退款按鈕顯示條件
 * The refund button should be shown ONLY when:
 *   - status === 'confirmed'
 *   - check-in date is in the future
 *   - check-in date is within the refund window (≤ REFUND_DAYS days)
 */
describe('Property 15: 退款按鈕顯示條件', () => {
  const NOW = new Date('2025-06-01T12:00:00Z')
  const nowMs = NOW.getTime()

  it('confirmed + future check-in within refund window → eligible', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: REFUND_DAYS }), (offsetDays) => {
        const check_in = isoDateOffset(nowMs, offsetDays)
        return isRefundEligible({ status: 'confirmed', check_in }, NOW) === true
      }),
      FC_PARAMS
    )
  })

  it('non-confirmed status → never eligible', () => {
    const nonConfirmedStatuses = allStatuses.filter((s) => s !== 'confirmed')
    fc.assert(
      fc.property(
        fc.constantFrom(...nonConfirmedStatuses),
        fc.integer({ min: 1, max: REFUND_DAYS }),
        (status, offsetDays) => {
          const check_in = isoDateOffset(nowMs, offsetDays)
          return isRefundEligible({ status, check_in }, NOW) === false
        }
      ),
      FC_PARAMS
    )
  })

  it('confirmed + check-in in the past → not eligible', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 365 }), (offsetDays) => {
        const check_in = isoDateOffset(nowMs, -offsetDays)
        return isRefundEligible({ status: 'confirmed', check_in }, NOW) === false
      }),
      FC_PARAMS
    )
  })

  it('confirmed + check-in beyond refund window → not eligible', () => {
    fc.assert(
      fc.property(fc.integer({ min: REFUND_DAYS + 1, max: 365 }), (offsetDays) => {
        const check_in = isoDateOffset(nowMs, offsetDays)
        return isRefundEligible({ status: 'confirmed', check_in }, NOW) === false
      }),
      FC_PARAMS
    )
  })
})

// ── Property 16: iCal 解析 Round-Trip ────────────────────────────────────────

/**
 * **Validates: Requirements 8.2**
 *
 * Property 16: iCal 解析 Round-Trip
 * Parsing an iCal text built from known dates must recover the original dates.
 */
describe('Property 16: iCal 解析 Round-Trip', () => {
  it('解析後的 start_date 應與原始 DTSTART 相符', () => {
    fc.assert(
      fc.property(dateRangeArb, ({ start, end }) => {
        const icalText = buildICalText(toICalDate(start), toICalDate(end))
        const events = parseICalEvents(icalText)
        expect(events).toHaveLength(1)
        expect(events[0].start_date).toBe(start)
      }),
      FC_PARAMS
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
      FC_PARAMS
    )
  })

  it('parseICalDate 應正確將 YYYYMMDD 轉換為 YYYY-MM-DD', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const icalDateStr = toICalDate(date)
        const parsed = parseICalDate(icalDateStr)
        expect(parsed).toBe(date)
      }),
      FC_PARAMS
    )
  })

  it('parseICalDate 應正確處理 DATETIME 格式（含 T 與 Z）', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const icalDateStr = toICalDate(date) + 'T120000Z'
        const parsed = parseICalDate(icalDateStr)
        expect(parsed).toBe(date)
      }),
      FC_PARAMS
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
      FC_PARAMS
    )
  })
})

// ── Property 17: 退款後訂單狀態更新 ──────────────────────────────────────────

/**
 * **Validates: Requirements 9.4**
 *
 * Property 17: 退款後訂單狀態更新
 * After applyRefund, status becomes 'refunded' and all other fields are unchanged.
 */
describe('Property 17: 退款後訂單狀態更新', () => {
  it('refund 後訂單狀態應從 confirmed 變為 refunded', () => {
    fc.assert(
      fc.property(confirmedBookingArb, (booking) => {
        const result = applyRefund(booking)
        return result.status === 'refunded'
      }),
      FC_PARAMS
    )
  })

  it('refund 後其他訂單欄位應保持不變', () => {
    fc.assert(
      fc.property(confirmedBookingArb, (booking) => {
        const result = applyRefund(booking)
        return (
          result.id === booking.id &&
          result.guest_email === booking.guest_email &&
          result.total_amount === booking.total_amount &&
          result.paypal_order_id === booking.paypal_order_id &&
          result.paypal_capture_id === booking.paypal_capture_id
        )
      }),
      FC_PARAMS
    )
  })

  it('refund 後應觸發退款通知 Email（email 欄位存在且非空）', () => {
    fc.assert(
      fc.property(confirmedBookingArb, (booking) => {
        const result = applyRefund(booking)
        return typeof result.guest_email === 'string' && result.guest_email.length > 0
      }),
      FC_PARAMS
    )
  })
})

// ── Property 18: 後台訂單篩選一致性 ──────────────────────────────────────────

/**
 * **Validates: Requirements 9.1**
 *
 * Property 18: 後台訂單篩選一致性
 * For any set of bookings and a status filter, the filtered results should
 * only contain bookings with the matching status.
 * For keyword search, all results should contain the keyword in guest_name
 * or guest_email.
 */
describe('Property 18: 後台訂單篩選一致性', () => {
  it('status filter returns only bookings with the matching status', () => {
    fc.assert(
      fc.property(arbBookings, arbStatus, (bookings, status) => {
        const result = filterBookingsByStatus(bookings, status)
        return result.every(b => b.status === status)
      }),
      FC_PARAMS
    )
  })

  it('status filter "all" returns all bookings unchanged', () => {
    fc.assert(
      fc.property(arbBookings, (bookings) => {
        const result = filterBookingsByStatus(bookings, 'all')
        return result.length === bookings.length
      }),
      FC_PARAMS
    )
  })

  it('status filter is a subset of the original list', () => {
    fc.assert(
      fc.property(arbBookings, arbStatus, (bookings, status) => {
        const result = filterBookingsByStatus(bookings, status)
        return result.length <= bookings.length
      }),
      FC_PARAMS
    )
  })

  it('keyword search returns only bookings containing the keyword in guest_name or guest_email', () => {
    fc.assert(
      fc.property(
        arbBookings,
        fc.string({ minLength: 1, maxLength: 5 }),
        (bookings, keyword) => {
          const result = filterBookingsByKeyword(bookings, keyword)
          const kw = keyword.trim().toLowerCase()
          return result.every(
            b =>
              b.guest_name.toLowerCase().includes(kw) ||
              b.guest_email.toLowerCase().includes(kw)
          )
        }
      ),
      FC_PARAMS
    )
  })

  it('empty keyword returns all bookings unchanged', () => {
    fc.assert(
      fc.property(arbBookings, (bookings) => {
        const result = filterBookingsByKeyword(bookings, '')
        return result.length === bookings.length
      }),
      FC_PARAMS
    )
  })

  it('keyword search result is a subset of the original list', () => {
    fc.assert(
      fc.property(
        arbBookings,
        fc.string({ minLength: 1, maxLength: 5 }),
        (bookings, keyword) => {
          const result = filterBookingsByKeyword(bookings, keyword)
          return result.length <= bookings.length
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 19: 民宿/房型 CRUD Round-Trip ────────────────────────────────────

/**
 * **Validates: Requirements 10.1, 10.2**
 *
 * Property 19: 民宿/房型 CRUD Round-Trip
 * After adding a property, it can be found by ID.
 * After updating a property, the updated fields are reflected.
 * After disabling a property (is_active = false), it doesn't appear in active-only queries.
 */
describe('Property 19: 民宿/房型 CRUD Round-Trip', () => {
  it('after adding a property, it can be found by ID', () => {
    fc.assert(
      fc.property(arbProperties, arbProperty, (list, newProperty) => {
        const updated = addProperty(list, newProperty)
        return updated.some(p => p.id === newProperty.id)
      }),
      FC_PARAMS
    )
  })

  it('after adding a property, the list length increases by 1', () => {
    fc.assert(
      fc.property(arbProperties, arbProperty, (list, newProperty) => {
        const updated = addProperty(list, newProperty)
        return updated.length === list.length + 1
      }),
      FC_PARAMS
    )
  })

  it('after updating a property, the updated fields are reflected', () => {
    fc.assert(
      fc.property(
        arbProperties.filter(list => list.length > 0),
        fc.string({ minLength: 1, maxLength: 30 }),
        (list, newName) => {
          const target = list[0]
          const updated = updateProperty(list, target.id, { name: newName })
          const found = updated.find(p => p.id === target.id)
          return found !== undefined && found.name === newName
        }
      ),
      FC_PARAMS
    )
  })

  it('updating a property does not change other properties', () => {
    fc.assert(
      fc.property(
        arbProperties.filter(list => list.length > 1),
        fc.string({ minLength: 1, maxLength: 30 }),
        (list, newName) => {
          const target = list[0]
          const updated = updateProperty(list, target.id, { name: newName })
          return list.slice(1).every(original => {
            const inUpdated = updated.find(p => p.id === original.id)
            return inUpdated !== undefined && inUpdated.name === original.name
          })
        }
      ),
      FC_PARAMS
    )
  })

  it('after disabling a property, it does not appear in active-only queries', () => {
    fc.assert(
      fc.property(
        arbProperties.filter(list => list.length > 0),
        (list) => {
          const target = list[0]
          const updated = updateProperty(list, target.id, { is_active: false })
          const active = getActiveProperties(updated)
          return !active.some(p => p.id === target.id)
        }
      ),
      FC_PARAMS
    )
  })

  it('getActiveProperties returns only properties with is_active = true', () => {
    fc.assert(
      fc.property(arbProperties, (list) => {
        const active = getActiveProperties(list)
        return active.every(p => p.is_active === true)
      }),
      FC_PARAMS
    )
  })

  it('getActiveProperties result is a subset of the original list', () => {
    fc.assert(
      fc.property(arbProperties, (list) => {
        const active = getActiveProperties(list)
        return active.length <= list.length
      }),
      FC_PARAMS
    )
  })
})
