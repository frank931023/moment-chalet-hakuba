// Feature: moment-chalet-booking-system, Property 11: 訂單摘要資訊完整性

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import BookingSummary from '@/components/BookingSummary.vue'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'

// ── Minimal i18n setup ────────────────────────────────────────────────────────

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

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Generate a valid check-in date (year 2024–2026, any month/day) */
const checkInArb = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2026-12-30'),
})

/** Generate a check-out date that is 1–30 nights after check-in */
const dateRangeArb = checkInArb.chain((checkIn) =>
  fc
    .integer({ min: 1, max: 30 })
    .map((nights) => {
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + nights)
      return { checkIn, checkOut, nights }
    })
)

const bookingPropsArb = fc.record({
  propertyName: fc.string({ minLength: 1, maxLength: 40 }),
  roomTypeName: fc.string({ minLength: 1, maxLength: 40 }),
  dateRange: dateRangeArb,
  includeBreakfast: fc.boolean(),
  pricePerNight: fc.integer({ min: 1000, max: 100_000 }),
  breakfastPrice: fc.integer({ min: 0, max: 5_000 }),
})

// ── Property 11: 訂單摘要資訊完整性 ──────────────────────────────────────────

/**
 * Validates: Requirements 4.5
 *
 * Property 11: 訂單摘要資訊完整性
 * For any booking data, the rendered BookingSummary should:
 *   1. Display the property name
 *   2. Display the room type name
 *   3. Display the check-in date
 *   4. Display the check-out date
 *   5. Display the total amount (consistent with Property 5 formula)
 *   6. If includeBreakfast is true, show breakfast fee
 */
describe('Property 11: 訂單摘要資訊完整性', () => {
  it('應顯示物業名稱、房型名稱、入住/退房日期、總金額', () => {
    fc.assert(
      fc.property(bookingPropsArb, ({ propertyName, roomTypeName, dateRange, includeBreakfast, pricePerNight, breakfastPrice }) => {
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

        // 1. Property name
        expect(text).toContain(propertyName)

        // 2. Room type name
        expect(text).toContain(roomTypeName)

        // 3. Check-in date (formatted with locale 'en')
        expect(text).toContain(formatDate(checkIn, 'en'))

        // 4. Check-out date
        expect(text).toContain(formatDate(checkOut, 'en'))

        // 5. Total amount — formula: (pricePerNight + (includeBreakfast ? breakfastPrice : 0)) * nights
        const expectedTotal = (pricePerNight + (includeBreakfast ? breakfastPrice : 0)) * nights
        expect(html).toContain(formatCurrency(expectedTotal))
      }),
      { numRuns: 100 }
    )
  })

  it('includeBreakfast=true 時應顯示早餐費用', () => {
    const withBreakfastArb = fc.record({
      propertyName: fc.string({ minLength: 1, maxLength: 40 }),
      roomTypeName: fc.string({ minLength: 1, maxLength: 40 }),
      dateRange: dateRangeArb,
      pricePerNight: fc.integer({ min: 1000, max: 100_000 }),
      breakfastPrice: fc.integer({ min: 100, max: 5_000 }),
    })

    fc.assert(
      fc.property(withBreakfastArb, ({ propertyName, roomTypeName, dateRange, pricePerNight, breakfastPrice }) => {
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

        // Breakfast fee line should appear
        const html = wrapper.html()
        expect(html).toContain(formatCurrency(breakfastPrice * nights))
      }),
      { numRuns: 100 }
    )
  })

  it('includeBreakfast=false 時不應顯示早餐費用行', () => {
    const noBreakfastArb = fc.record({
      propertyName: fc.string({ minLength: 1, maxLength: 40 }),
      roomTypeName: fc.string({ minLength: 1, maxLength: 40 }),
      dateRange: dateRangeArb,
      pricePerNight: fc.integer({ min: 1000, max: 100_000 }),
      breakfastPrice: fc.integer({ min: 100, max: 5_000 }),
    })

    fc.assert(
      fc.property(noBreakfastArb, ({ propertyName, roomTypeName, dateRange, pricePerNight, breakfastPrice }) => {
        const { checkIn, checkOut } = dateRange

        const wrapper = mount(BookingSummary, {
          props: {
            propertyName,
            roomTypeName,
            checkIn,
            checkOut,
            includeBreakfast: false,
            pricePerNight,
            breakfastPrice,
          },
          global: { plugins: [i18n] },
        })

        // The v-if="includeBreakfast" breakfast fee row should not be rendered
        const text = wrapper.text()
        expect(text).not.toContain('Breakfast fee')
      }),
      { numRuns: 100 }
    )
  })
})
