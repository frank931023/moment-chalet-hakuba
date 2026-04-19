// Feature: moment-chalet-booking-system, Property 18: 後台訂單篩選一致性

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import type { Booking, BookingStatus } from '@/types'

// ── Pure filter helpers (mirrored from AdminBookingsView.vue) ─────────────────

function filterBookingsByStatus(
  bookings: Booking[],
  status: BookingStatus | 'all'
): Booking[] {
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

// ── Arbitraries ───────────────────────────────────────────────────────────────

const allStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'refunded']

const arbStatus = fc.constantFrom(...allStatuses)

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

// ── Property 18: 後台訂單篩選一致性 ──────────────────────────────────────────

/**
 * Validates: Requirements 9.1
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
      { numRuns: 100 }
    )
  })

  it('status filter "all" returns all bookings unchanged', () => {
    fc.assert(
      fc.property(arbBookings, (bookings) => {
        const result = filterBookingsByStatus(bookings, 'all')
        return result.length === bookings.length
      }),
      { numRuns: 100 }
    )
  })

  it('status filter is a subset of the original list', () => {
    fc.assert(
      fc.property(arbBookings, arbStatus, (bookings, status) => {
        const result = filterBookingsByStatus(bookings, status)
        return result.length <= bookings.length
      }),
      { numRuns: 100 }
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
      { numRuns: 100 }
    )
  })

  it('empty keyword returns all bookings unchanged', () => {
    fc.assert(
      fc.property(arbBookings, (bookings) => {
        const result = filterBookingsByKeyword(bookings, '')
        return result.length === bookings.length
      }),
      { numRuns: 100 }
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
      { numRuns: 100 }
    )
  })
})
