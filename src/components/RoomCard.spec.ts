// Feature: moment-chalet-booking-system, Property 3: 房型卡片資訊完整性
// Feature: moment-chalet-booking-system, Property 4: 早餐選項顯示規則

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import RoomCard from '@/components/RoomCard.vue'
import type { RoomType } from '@/types'
import { formatCurrency } from '@/utils/currency'

// ── Minimal i18n setup ────────────────────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      roomCard: {
        capacity: 'Up to {n} guests',
        perNight: 'night',
        breakfastOption: 'Breakfast',
        withBreakfast: 'With breakfast',
        noBreakfast: 'Without breakfast',
      },
    },
  },
})

// ── Arbitraries ───────────────────────────────────────────────────────────────

const roomTypeArb = fc.record<RoomType>({
  id: fc.uuid(),
  property_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim() === s && s.trim().length > 0),
  capacity: fc.integer({ min: 1, max: 20 }),
  price_per_night: fc.integer({ min: 1000, max: 100000 }),
  breakfast_price: fc.integer({ min: 0, max: 5000 }),
  amenities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 8 }),
  images: fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
})

// ── Property 3: 房型卡片資訊完整性 ───────────────────────────────────────────

/**
 * Validates: Requirements 2.1
 *
 * Property 3: 房型卡片資訊完整性
 * For any RoomType data, the rendered RoomCard should contain:
 *   - Room type name
 *   - Capacity information
 *   - Price per night (in TWD format)
 *   - At least one amenity (if amenities array is non-empty)
 */
describe('Property 3: 房型卡片資訊完整性', () => {
  it('應顯示房型名稱、容納人數、每晚價格', () => {
    fc.assert(
      fc.property(roomTypeArb, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: false },
          global: { plugins: [i18n] },
        })

        // Use text() to avoid HTML-entity encoding issues with special chars
        const text = wrapper.text()

        // Room type name
        expect(text).toContain(roomType.name)

        // Capacity — the rendered text uses the i18n key with n substituted
        expect(text).toContain(String(roomType.capacity))

        // Price per night in TWD format (numbers are safe in html too)
        expect(wrapper.html()).toContain(formatCurrency(roomType.price_per_night))
      }),
      { numRuns: 100 }
    )
  })

  it('非空設施清單時應至少顯示一項設施', () => {
    const roomTypeWithAmenitiesArb = fc.record<RoomType>({
      id: fc.uuid(),
      property_id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 40 }),
      capacity: fc.integer({ min: 1, max: 20 }),
      price_per_night: fc.integer({ min: 1000, max: 100000 }),
      breakfast_price: fc.integer({ min: 0, max: 5000 }),
      amenities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 8 }),
      images: fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
      is_active: fc.boolean(),
      created_at: fc.constant(new Date().toISOString()),
    })

    fc.assert(
      fc.property(roomTypeWithAmenitiesArb, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: false },
          global: { plugins: [i18n] },
        })

        const amenityItems = wrapper.findAll('li')
        expect(amenityItems.length).toBeGreaterThanOrEqual(1)

        // At least the first amenity text should appear (use text() to avoid HTML encoding)
        expect(wrapper.text()).toContain(roomType.amenities[0])
      }),
      { numRuns: 100 }
    )
  })
})

// ── Property 4: 早餐選項顯示規則 ─────────────────────────────────────────────

/**
 * Validates: Requirements 2.2
 *
 * Property 4: 早餐選項顯示規則
 * When hasBreakfastOption is true: breakfast toggle should be visible.
 * When hasBreakfastOption is false: breakfast toggle should NOT be visible.
 */
describe('Property 4: 早餐選項顯示規則', () => {
  it('hasBreakfastOption=true 時應顯示早餐切換區塊', () => {
    fc.assert(
      fc.property(roomTypeArb, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: true },
          global: { plugins: [i18n] },
        })

        // The breakfast section contains radio inputs
        const radios = wrapper.findAll('input[type="radio"]')
        expect(radios.length).toBeGreaterThanOrEqual(2)
      }),
      { numRuns: 100 }
    )
  })

  it('hasBreakfastOption=false 時不應顯示早餐切換區塊', () => {
    fc.assert(
      fc.property(roomTypeArb, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: false },
          global: { plugins: [i18n] },
        })

        const radios = wrapper.findAll('input[type="radio"]')
        expect(radios.length).toBe(0)
      }),
      { numRuns: 100 }
    )
  })
})
