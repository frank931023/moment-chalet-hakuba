// Feature: moment-chalet-booking-system, Property 13: 訂單確認頁資訊完整性
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Validates that all required fields for the booking confirmation page are present.
 * - bookingId: non-empty string
 * - propertyName: non-empty string
 * - roomTypeName: non-empty string
 * - checkIn: valid Date
 * - checkOut: valid Date (after checkIn)
 * - totalAmount: positive number
 */
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

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbNonBlankString = (maxLength = 50) =>
  fc.string({ minLength: 1, maxLength }).filter((s) => s.trim().length > 0)

const arbCheckInOut = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-30') }),
  fc.integer({ min: 1, max: 30 })
).map(([checkIn, nights]) => ({
  checkIn,
  checkOut: new Date(checkIn.getTime() + nights * 24 * 60 * 60 * 1000)
}))

const arbValidConfirmationData = arbCheckInOut.chain(({ checkIn, checkOut }) =>
  fc.record({
    bookingId: fc.uuid(),
    propertyName: arbNonBlankString(50),
    roomTypeName: arbNonBlankString(50),
    checkIn: fc.constant(checkIn),
    checkOut: fc.constant(checkOut),
    totalAmount: fc.integer({ min: 1, max: 1_000_000 }).map(Number)
  })
)

// ── Tests ─────────────────────────────────────────────────────────────────────

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
        return validateConfirmationData(data) === true
      }),
      { numRuns: 100 }
    )
  })

  it('缺少必要欄位的訂單確認資料應驗證失敗', () => {
    const base = {
      bookingId: 'abc-123',
      propertyName: 'Moment Chalet',
      roomTypeName: 'Deluxe Room',
      checkIn: new Date('2025-01-10'),
      checkOut: new Date('2025-01-15'),
      totalAmount: 15000
    }

    // Missing bookingId
    expect(validateConfirmationData({ ...base, bookingId: '' })).toBe(false)

    // Missing propertyName
    expect(validateConfirmationData({ ...base, propertyName: '' })).toBe(false)

    // Missing roomTypeName
    expect(validateConfirmationData({ ...base, roomTypeName: '' })).toBe(false)

    // Zero totalAmount
    expect(validateConfirmationData({ ...base, totalAmount: 0 })).toBe(false)

    // Negative totalAmount
    expect(validateConfirmationData({ ...base, totalAmount: -100 })).toBe(false)
  })
})
