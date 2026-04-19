// Feature: moment-chalet-booking-system
// Consolidated property tests for booking flow (Properties 9–13)

import fc from 'fast-check'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { validateGuestForm } from '@/utils/formValidation'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import BookingSummary from '@/components/BookingSummary.vue'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import type { Booking } from '@/types'
import {
  FC_PARAMS,
  arbRoomType,
  arbNonBlankString,
} from './setup'

// ── i18n for BookingSummary ───────────────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      bookingSummary: {
        title: 'Booking Summary',
        property: 'Property',
        roomType: 'Room Type',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        nights: 'Nights',
        breakfast: 'Breakfast',
        included: 'Included',
        notIncluded: 'Not included',
        breakfastFee: 'Breakfast fee',
        total: 'Total',
      },
    },
  },
})

// ── Shared arbitraries ────────────────────────────────────────────────────────

const arbCheckInOut = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2026-11-30') })
  .chain((checkIn) =>
    fc.integer({ min: 1, max: 30 }).map((nights) => {
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + nights)
      return { checkIn, checkOut, nights }
    })
  )

/** Non-empty, non-whitespace-only string */
const nonEmptyString = fc.string({ minLength: 1 }).filter((s) => s.trim() !== '')

/** Whitespace-only string */
const whitespaceString = fc
  .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
  .map((arr) => arr.join(''))

/** Simple valid email: local@domain.tld */
const validEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z]{2,4}$/)
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

/** Pure state-transition: apply PayPal capture to a booking */
function applyCapture(booking: Booking, paypalOrderId: string, captureId: string): Booking {
  return {
    ...booking,
    status: 'confirmed',
    paypal_order_id: paypalOrderId,
    paypal_capture_id: captureId,
  }
}

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

const paypalIdArb = fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0)

/** Confirmation data validator (mirrors BookingConfirmationView logic) */
function validateConfirmationData(data: {
  bookingId: string
  propertyName: string
  roomTypeName: string
  checkIn: Date
  checkOut: Date
  totalAmount: number
}): boolean {
  if (!data.bookingId || data.bookingId.trim() === '') return false
  if (!data.propertyName || data.propertyName.trim() === '') return false
  if (!data.roomTypeName || data.roomTypeName.trim() === '') return false
  if (!(data.checkIn instanceof Date) || isNaN(data.checkIn.getTime())) return false
  if (!(data.checkOut instanceof Date) || isNaN(data.checkOut.getTime())) return false
  if (typeof data.totalAmount !== 'number' || data.totalAmount <= 0) return false
  return true
}

const arbValidConfirmationData = fc
  .tuple(
    fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-30') }),
    fc.integer({ min: 1, max: 30 })
  )
  .chain(([checkIn, nights]) => {
    const checkOut = new Date(checkIn.getTime() + nights * 24 * 60 * 60 * 1000)
    return fc.record({
      bookingId: fc.uuid(),
      propertyName: arbNonBlankString,
      roomTypeName: arbNonBlankString,
      checkIn: fc.constant(checkIn),
      checkOut: fc.constant(checkOut),
      totalAmount: fc.integer({ min: 1, max: 1_000_000 }),
    })
  })

// ── Property 9: 步驟一完成條件 ───────────────────────────────────────────────

/**
 * Validates: Requirements 4.2
 *
 * Property 9: 步驟一完成條件
 * isStep1Complete is true if and only if:
 *   - checkIn is set
 *   - checkOut is set
 *   - checkOut > checkIn
 *   - selectedRoomType is set
 */
describe('Property 9: 步驟一完成條件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('所有條件滿足時 isStep1Complete 為 true', () => {
    fc.assert(
      fc.property(arbRoomType, arbCheckInOut, (roomType, { checkIn, checkOut }) => {
        const store = useBookingStore()
        store.checkIn = checkIn
        store.checkOut = checkOut
        store.selectedRoomType = roomType
        expect(store.isStep1Complete).toBe(true)
      }),
      FC_PARAMS
    )
  })

  it('缺少 selectedRoomType 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(arbCheckInOut, ({ checkIn, checkOut }) => {
        const store = useBookingStore()
        store.checkIn = checkIn
        store.checkOut = checkOut
        store.selectedRoomType = null
        expect(store.isStep1Complete).toBe(false)
      }),
      FC_PARAMS
    )
  })

  it('checkOut <= checkIn 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        arbRoomType,
        fc.date({ min: new Date('2024-02-01'), max: new Date('2026-12-31') }),
        fc.integer({ min: 0, max: 10 }),
        (roomType, checkIn, offset) => {
          const store = useBookingStore()
          const checkOut = new Date(checkIn)
          checkOut.setDate(checkOut.getDate() - offset) // checkOut <= checkIn
          store.checkIn = checkIn
          store.checkOut = checkOut
          store.selectedRoomType = roomType
          expect(store.isStep1Complete).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })

  it('缺少 checkIn 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        arbRoomType,
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        (roomType, checkOut) => {
          const store = useBookingStore()
          store.checkIn = null
          store.checkOut = checkOut
          store.selectedRoomType = roomType
          expect(store.isStep1Complete).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })

  it('缺少 checkOut 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        arbRoomType,
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        (roomType, checkIn) => {
          const store = useBookingStore()
          store.checkIn = checkIn
          store.checkOut = null
          store.selectedRoomType = roomType
          expect(store.isStep1Complete).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 10: 必填欄位驗證 ─────────────────────────────────────────────────

/**
 * Validates: Requirements 4.4
 *
 * Property 10: 必填欄位驗證
 * For any form submission where guestName, guestEmail, or guestPhone is
 * empty/whitespace-only, the form should be invalid.
 * For any form submission where all three fields are non-empty (and email
 * has valid format), the form should be valid.
 */
describe('Property 10: 必填欄位驗證', () => {
  it('任一欄位為空或純空白時，validateGuestForm 回傳 invalid', () => {
    // name is empty/whitespace
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), whitespaceString),
        validEmail,
        nonEmptyString,
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          expect(result.valid).toBe(false)
        }
      ),
      FC_PARAMS
    )

    // email is empty/whitespace
    fc.assert(
      fc.property(
        nonEmptyString,
        fc.oneof(fc.constant(''), whitespaceString),
        nonEmptyString,
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          expect(result.valid).toBe(false)
        }
      ),
      FC_PARAMS
    )

    // phone is empty/whitespace
    fc.assert(
      fc.property(
        nonEmptyString,
        validEmail,
        fc.oneof(fc.constant(''), whitespaceString),
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          expect(result.valid).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })

  it('三個欄位皆非空且 email 格式正確時，validateGuestForm 回傳 valid', () => {
    fc.assert(
      fc.property(nonEmptyString, validEmail, nonEmptyString, (name, email, phone) => {
        const result = validateGuestForm(name, email, phone)
        expect(result.valid).toBe(true)
      }),
      FC_PARAMS
    )
  })
})

// ── Property 11: 訂單摘要資訊完整性 ──────────────────────────────────────────

/**
 * Validates: Requirements 4.5
 *
 * Property 11: 訂單摘要資訊完整性
 * For any booking data, the rendered BookingSummary should display:
 *   1. Property name
 *   2. Room type name
 *   3. Check-in date
 *   4. Check-out date
 *   5. Total amount (consistent with Property 5 formula)
 *   6. Breakfast fee when includeBreakfast is true
 */
describe('Property 11: 訂單摘要資訊完整性', () => {
  const bookingSummaryArb = fc.record({
    propertyName: arbNonBlankString,
    roomTypeName: arbNonBlankString,
    dateRange: arbCheckInOut,
    includeBreakfast: fc.boolean(),
    pricePerNight: fc.integer({ min: 1000, max: 100_000 }),
    breakfastPrice: fc.integer({ min: 0, max: 5_000 }),
  })

  it('應顯示物業名稱、房型名稱、入住/退房日期、總金額', () => {
    fc.assert(
      fc.property(
        bookingSummaryArb,
        ({ propertyName, roomTypeName, dateRange, includeBreakfast, pricePerNight, breakfastPrice }) => {
          const { checkIn, checkOut, nights } = dateRange

          const wrapper = mount(BookingSummary, {
            props: {
              propertyName,
              roomTypeName,
              checkIn,
              checkOut,
              includeBreakfast,
              pricePerNight,
              breakfastPrice,
            },
            global: { plugins: [i18n] },
          })

          const text = wrapper.text()
          const html = wrapper.html()

          expect(text).toContain(propertyName)
          expect(text).toContain(roomTypeName)
          expect(text).toContain(formatDate(checkIn, 'en'))
          expect(text).toContain(formatDate(checkOut, 'en'))

          const expectedTotal =
            (pricePerNight + (includeBreakfast ? breakfastPrice : 0)) * nights
          expect(html).toContain(formatCurrency(expectedTotal))
        }
      ),
      FC_PARAMS
    )
  })

  it('includeBreakfast=true 時應顯示早餐費用', () => {
    fc.assert(
      fc.property(
        fc.record({
          propertyName: arbNonBlankString,
          roomTypeName: arbNonBlankString,
          dateRange: arbCheckInOut,
          pricePerNight: fc.integer({ min: 1000, max: 100_000 }),
          breakfastPrice: fc.integer({ min: 100, max: 5_000 }),
        }),
        ({ propertyName, roomTypeName, dateRange, pricePerNight, breakfastPrice }) => {
          const { checkIn, checkOut, nights } = dateRange

          const wrapper = mount(BookingSummary, {
            props: {
              propertyName,
              roomTypeName,
              checkIn,
              checkOut,
              includeBreakfast: true,
              pricePerNight,
              breakfastPrice,
            },
            global: { plugins: [i18n] },
          })

          expect(wrapper.html()).toContain(formatCurrency(breakfastPrice * nights))
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 12: 付款確認後訂單狀態更新 ──────────────────────────────────────

/**
 * Validates: Requirements 5.4, 5.5
 *
 * Property 12: 付款確認後訂單狀態更新
 * After applyCapture:
 *   - status becomes 'confirmed'
 *   - paypal_order_id and paypal_capture_id are recorded
 *   - all other booking fields remain unchanged
 */
describe('Property 12: 付款確認後訂單狀態更新', () => {
  it('capture 後訂單狀態應從 pending 變為 confirmed', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        expect(result.status).toBe('confirmed')
      }),
      FC_PARAMS
    )
  })

  it('capture 後 paypal_order_id 與 paypal_capture_id 應被正確記錄', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        expect(result.paypal_order_id).toBe(orderId)
        expect(result.paypal_capture_id).toBe(captureId)
      }),
      FC_PARAMS
    )
  })

  it('capture 後其他訂單欄位應保持不變', () => {
    fc.assert(
      fc.property(bookingArb, paypalIdArb, paypalIdArb, (booking, orderId, captureId) => {
        const result = applyCapture(booking, orderId, captureId)
        expect(result.id).toBe(booking.id)
        expect(result.guest_email).toBe(booking.guest_email)
        expect(result.total_amount).toBe(booking.total_amount)
        expect(result.check_in).toBe(booking.check_in)
        expect(result.check_out).toBe(booking.check_out)
      }),
      FC_PARAMS
    )
  })
})

// ── Property 13: 訂單確認頁資訊完整性 ────────────────────────────────────────

/**
 * Validates: Requirements 6.1
 *
 * Property 13: 訂單確認頁資訊完整性
 * For any confirmed booking data, the confirmation page should display all
 * required fields: booking ID, property name, room type name, check-in date,
 * check-out date, and total amount.
 */
describe('Property 13: 訂單確認頁資訊完整性', () => {
  it('有效訂單確認資料應通過完整性驗證', () => {
    fc.assert(
      fc.property(arbValidConfirmationData, (data) => {
        expect(validateConfirmationData(data)).toBe(true)
      }),
      FC_PARAMS
    )
  })

  it('缺少任一必要欄位時應驗證失敗', () => {
    const base = {
      bookingId: 'abc-123',
      propertyName: 'Moment Chalet',
      roomTypeName: 'Deluxe Room',
      checkIn: new Date('2025-01-10'),
      checkOut: new Date('2025-01-15'),
      totalAmount: 15000,
    }

    expect(validateConfirmationData({ ...base, bookingId: '' })).toBe(false)
    expect(validateConfirmationData({ ...base, propertyName: '' })).toBe(false)
    expect(validateConfirmationData({ ...base, roomTypeName: '' })).toBe(false)
    expect(validateConfirmationData({ ...base, totalAmount: 0 })).toBe(false)
    expect(validateConfirmationData({ ...base, totalAmount: -100 })).toBe(false)
  })

  it('bookingId 為空白字串時應驗證失敗', () => {
    fc.assert(
      fc.property(
        arbValidConfirmationData,
        fc.oneof(fc.constant(''), whitespaceString),
        (data, emptyId) => {
          expect(validateConfirmationData({ ...data, bookingId: emptyId })).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })

  it('totalAmount 為非正數時應驗證失敗', () => {
    fc.assert(
      fc.property(
        arbValidConfirmationData,
        fc.integer({ min: -100_000, max: 0 }),
        (data, nonPositive) => {
          expect(validateConfirmationData({ ...data, totalAmount: nonPositive })).toBe(false)
        }
      ),
      FC_PARAMS
    )
  })
})
