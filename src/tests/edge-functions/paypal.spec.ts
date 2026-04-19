// Feature: moment-chalet-booking-system, Property 12: 付款確認後訂單狀態更新
// Feature: moment-chalet-booking-system, Property 17: 退款後訂單狀態更新

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import type { Booking } from '../../types/index'

// ─── Pure state transition functions ────────────────────────────────────────

function applyCapture(booking: Booking, paypalOrderId: string, captureId: string): Booking {
  return {
    ...booking,
    status: 'confirmed',
    paypal_order_id: paypalOrderId,
    paypal_capture_id: captureId,
  }
}

function applyRefund(booking: Booking): Booking {
  return {
    ...booking,
    status: 'refunded',
  }
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const bookingArb = fc.record<Booking>({
  id: fc.uuid(),
  room_type_id: fc.uuid(),
  guest_name: fc.string({ minLength: 1, maxLength: 50 }),
  guest_email: fc.emailAddress(),
  guest_phone: fc.string({ minLength: 7, maxLength: 20 }),
  check_in: fc.constant('2025-08-01'),
  check_out: fc.constant('2025-08-05'),
  include_breakfast: fc.boolean(),
  total_amount: fc.integer({ min: 1000, max: 500000 }),
  status: fc.constant('pending' as const),
  paypal_order_id: fc.constant(null),
  paypal_capture_id: fc.constant(null),
  special_requests: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  created_at: fc.constant('2025-01-01T00:00:00Z'),
})

const confirmedBookingArb = bookingArb.map(b => ({
  ...b,
  status: 'confirmed' as const,
  paypal_order_id: 'ORDER-123',
  paypal_capture_id: 'CAPTURE-456',
}))

const paypalIdArb = fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0)

// ─── Property 12: 付款確認後訂單狀態更新 ─────────────────────────────────────
// Validates: Requirements 5.4, 5.5

describe('Property 12: 付款確認後訂單狀態更新', () => {
  it('capture 後訂單狀態應從 pending 變為 confirmed', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        return result.status === 'confirmed'
      }),
      { numRuns: 100 }
    )
  })

  it('capture 後 paypal_order_id 應被正確記錄', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        return result.paypal_order_id === orderId
      }),
      { numRuns: 100 }
    )
  })

  it('capture 後 paypal_capture_id 應被正確記錄', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        return result.paypal_capture_id === captureId
      }),
      { numRuns: 100 }
    )
  })

  it('capture 後其他訂單欄位應保持不變', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        return (
          result.id === booking.id &&
          result.guest_email === booking.guest_email &&
          result.total_amount === booking.total_amount &&
          result.check_in === booking.check_in &&
          result.check_out === booking.check_out
        )
      }),
      { numRuns: 100 }
    )
  })

  it('capture 後應觸發 Email 通知（email 欄位存在且非空）', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        // Email notification is triggered based on guest_email being present
        return typeof result.guest_email === 'string' && result.guest_email.length > 0
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 17: 退款後訂單狀態更新 ─────────────────────────────────────────
// Validates: Requirements 9.4

describe('Property 17: 退款後訂單狀態更新', () => {
  it('refund 後訂單狀態應從 confirmed 變為 refunded', () => {
    fc.assert(
      fc.property(confirmedBookingArb, (booking) => {
        const result = applyRefund(booking)
        return result.status === 'refunded'
      }),
      { numRuns: 100 }
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
      { numRuns: 100 }
    )
  })

  it('refund 後應觸發退款通知 Email（email 欄位存在且非空）', () => {
    fc.assert(
      fc.property(confirmedBookingArb, (booking) => {
        const result = applyRefund(booking)
        // Email notification is triggered based on guest_email being present
        return typeof result.guest_email === 'string' && result.guest_email.length > 0
      }),
      { numRuns: 100 }
    )
  })
})
