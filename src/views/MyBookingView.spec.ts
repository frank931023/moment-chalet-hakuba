// Feature: moment-chalet-booking-system, Property 14: 訂單查詢正確性
// Feature: moment-chalet-booking-system, Property 15: 退款按鈕顯示條件

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import type { BookingStatus } from '@/types'

// ── Pure helpers (mirrored from MyBookingView.vue) ────────────────────────────

const REFUND_DAYS = 7

/**
 * Determines whether a booking is eligible for a refund.
 * - status must be 'confirmed'
 * - check-in must be in the future
 * - check-in must be within REFUND_DAYS days from now
 */
function isRefundEligible(
  booking: { status: BookingStatus; check_in: string },
  now: Date = new Date()
): boolean {
  if (booking.status !== 'confirmed') return false
  const checkInDate = new Date(booking.check_in)
  const diffDays = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > 0 && diffDays <= REFUND_DAYS
}

/**
 * Simulates a booking lookup: returns the booking's status when email + id match,
 * or null when they don't.
 */
function lookupBooking(
  bookings: Array<{ id: string; guest_email: string; status: BookingStatus }>,
  email: string,
  id: string
): BookingStatus | null {
  const found = bookings.find((b) => b.id === id && b.guest_email === email)
  return found ? found.status : null
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const allStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'refunded']

const arbStatus = fc.constantFrom(...allStatuses)

const arbEmail = fc
  .tuple(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 10 }))
  .map(([local, domain]) => `${local}@${domain}.com`)

const arbBookingId = fc.uuid()

/** ISO date string offset by `days` from a fixed reference point */
function isoDateOffset(baseDateMs: number, days: number): string {
  return new Date(baseDateMs + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// ── Property 14: 訂單查詢正確性 ───────────────────────────────────────────────

/**
 * Validates: Requirements 7.2, 7.3
 *
 * Property 14: 訂單查詢正確性
 * For any valid email + booking ID combination that matches a booking, the
 * result should show the correct booking status.
 * For any invalid combination, the result should be null ("not found").
 */
describe('Property 14: 訂單查詢正確性', () => {
  it('matching email + id returns the correct booking status', () => {
    fc.assert(
      fc.property(
        arbEmail,
        arbBookingId,
        arbStatus,
        (email, id, status) => {
          const bookings = [{ id, guest_email: email, status }]
          const result = lookupBooking(bookings, email, id)
          return result === status
        }
      ),
      { numRuns: 100 }
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
          // Ensure at least one field differs so there is no accidental match
          fc.pre(storedEmail !== queryEmail || storedId !== queryId)
          const bookings = [{ id: storedId, guest_email: storedEmail, status }]
          const result = lookupBooking(bookings, queryEmail, queryId)
          return result === null
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty booking list always returns null', () => {
    fc.assert(
      fc.property(arbEmail, arbBookingId, (email, id) => {
        return lookupBooking([], email, id) === null
      }),
      { numRuns: 100 }
    )
  })
})

// ── Property 15: 退款按鈕顯示條件 ────────────────────────────────────────────

/**
 * Validates: Requirements 7.4
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
      fc.property(
        // offset in [1, REFUND_DAYS] whole days — strictly future, within window
        fc.integer({ min: 1, max: REFUND_DAYS }),
        (offsetDays) => {
          const check_in = isoDateOffset(nowMs, offsetDays)
          return isRefundEligible({ status: 'confirmed', check_in }, NOW) === true
        }
      ),
      { numRuns: 100 }
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
      { numRuns: 100 }
    )
  })

  it('confirmed + check-in in the past → not eligible', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (offsetDays) => {
          const check_in = isoDateOffset(nowMs, -offsetDays)
          return isRefundEligible({ status: 'confirmed', check_in }, NOW) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('confirmed + check-in beyond refund window → not eligible', () => {
    fc.assert(
      fc.property(
        // offset strictly greater than REFUND_DAYS
        fc.integer({ min: REFUND_DAYS + 1, max: 365 }),
        (offsetDays) => {
          const check_in = isoDateOffset(nowMs, offsetDays)
          return isRefundEligible({ status: 'confirmed', check_in }, NOW) === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
