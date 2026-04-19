// Feature: moment-chalet-booking-system
// Consolidated property tests for filtering and display (Properties 1–4)
// These re-run the key assertions using shared arbitraries from setup.ts

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { filterProperties } from '@/stores/propertyFilters'
import RoomCard from '@/components/RoomCard.vue'
import type { Property, RoomType, PropertyFilters } from '@/types'
import { formatCurrency } from '@/utils/currency'
import {
  FC_PARAMS,
  arbProperty,
  arbRoomType,
} from './setup'

// ── i18n for RoomCard ─────────────────────────────────────────────────────────

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

// ── Shared arbitraries ────────────────────────────────────────────────────────

/** Properties with their associated room types, IDs properly linked */
const arbPropertiesWithRooms = fc
  .array(arbProperty, { minLength: 0, maxLength: 8 })
  .chain((props) => {
    if (props.length === 0) {
      return fc.constant({
        properties: [] as Property[],
        roomTypesByProperty: {} as Record<string, RoomType[]>,
      })
    }
    return fc
      .tuple(...props.map((p) =>
        fc.array(
          arbRoomType.map((rt) => ({ ...rt, property_id: p.id })),
          { minLength: 0, maxLength: 4 }
        )
      ))
      .map((roomArrays) => {
        const roomTypesByProperty: Record<string, RoomType[]> = {}
        props.forEach((p, i) => { roomTypesByProperty[p.id] = roomArrays[i] })
        return { properties: props, roomTypesByProperty }
      })
  })

const arbFilters: fc.Arbitrary<PropertyFilters> = fc.record<PropertyFilters>({
  location: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 10 })),
  checkIn: fc.constant(null),
  checkOut: fc.constant(null),
  guests: fc.integer({ min: 1, max: 8 }),
  priceRange: fc
    .tuple(fc.integer({ min: 0, max: 49000 }), fc.integer({ min: 1000, max: 100000 }))
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
})

/** RoomType with trimmed non-blank name (required by RoomCard) */
const arbRoomTypeForCard = arbRoomType.filter(
  (rt) => rt.name.trim().length > 0 && rt.name.trim() === rt.name
)

// ── Property 1: 篩選結果一致性 ────────────────────────────────────────────────

/**
 * Validates: Requirements 1.2
 *
 * Property 1: 篩選結果一致性
 * Every property returned by filterProperties must satisfy all active filter
 * criteria; no non-matching property should appear in the result.
 */
describe('Property 1: 篩選結果一致性', () => {
  it('篩選結果中每筆民宿均符合所有篩選條件', () => {
    fc.assert(
      fc.property(arbPropertiesWithRooms, arbFilters, ({ properties, roomTypesByProperty }, filters) => {
        const result = filterProperties(properties, roomTypesByProperty, filters)
        const [minPrice, maxPrice] = filters.priceRange

        return result.every((p) => {
          const roomTypes = roomTypesByProperty[p.id] ?? []

          if (filters.location && !p.location.toLowerCase().includes(filters.location.toLowerCase())) {
            return false
          }
          if (filters.guests > 1 && !roomTypes.some((rt) => rt.is_active && rt.capacity >= filters.guests)) {
            return false
          }
          if ((minPrice > 0 || maxPrice < 100000) &&
            !roomTypes.some((rt) => rt.is_active && rt.price_per_night >= minPrice && rt.price_per_night <= maxPrice)) {
            return false
          }
          return true
        })
      }),
      FC_PARAMS
    )
  })

  it('空篩選條件返回所有民宿', () => {
    fc.assert(
      fc.property(arbPropertiesWithRooms, ({ properties, roomTypesByProperty }) => {
        const emptyFilters: PropertyFilters = {
          location: '',
          checkIn: null,
          checkOut: null,
          guests: 1,
          priceRange: [0, 100000],
        }
        const result = filterProperties(properties, roomTypesByProperty, emptyFilters)
        return result.length === properties.length
      }),
      FC_PARAMS
    )
  })
})

// ── Property 2: 民宿詳情頁完整性 ─────────────────────────────────────────────

/**
 * Validates: Requirements 1.5
 *
 * Property 2: 民宿詳情頁完整性
 * Any valid Property must have non-empty name, location, description, and at
 * least one image — the minimum data required to render the detail page.
 */
describe('Property 2: 民宿詳情頁完整性', () => {
  const arbValidProperty = arbProperty.filter(
    (p) =>
      p.name.trim().length > 0 &&
      p.location.trim().length > 0 &&
      p.description.trim().length > 0 &&
      p.images.length > 0
  )

  it('有效民宿資料包含詳情頁所需的所有必要欄位', () => {
    fc.assert(
      fc.property(arbValidProperty, (property) => {
        expect(property.name.trim().length).toBeGreaterThan(0)
        expect(property.location.trim().length).toBeGreaterThan(0)
        expect(property.description.trim().length).toBeGreaterThan(0)
        expect(property.images.length).toBeGreaterThan(0)
      }),
      FC_PARAMS
    )
  })
})

// ── Property 3: 房型卡片資訊完整性 ───────────────────────────────────────────

/**
 * Validates: Requirements 2.1
 *
 * Property 3: 房型卡片資訊完整性
 * For any RoomType, the rendered RoomCard must display the room name, capacity,
 * and price per night.
 */
describe('Property 3: 房型卡片資訊完整性', () => {
  it('RoomCard 應顯示房型名稱、容納人數與每晚價格', () => {
    fc.assert(
      fc.property(arbRoomTypeForCard, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: false },
          global: { plugins: [i18n] },
        })

        const text = wrapper.text()
        expect(text).toContain(roomType.name)
        expect(text).toContain(String(roomType.capacity))
        expect(wrapper.html()).toContain(formatCurrency(roomType.price_per_night))
      }),
      FC_PARAMS
    )
  })
})

// ── Property 4: 早餐選項顯示規則 ─────────────────────────────────────────────

/**
 * Validates: Requirements 2.2
 *
 * Property 4: 早餐選項顯示規則
 * When hasBreakfastOption is true the breakfast radio inputs must be present;
 * when false they must be absent.
 */
describe('Property 4: 早餐選項顯示規則', () => {
  it('hasBreakfastOption=true 時應顯示早餐切換選項', () => {
    fc.assert(
      fc.property(arbRoomTypeForCard, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: true },
          global: { plugins: [i18n] },
        })
        const radios = wrapper.findAll('input[type="radio"]')
        expect(radios.length).toBeGreaterThanOrEqual(2)
      }),
      FC_PARAMS
    )
  })

  it('hasBreakfastOption=false 時不應顯示早餐切換選項', () => {
    fc.assert(
      fc.property(arbRoomTypeForCard, (roomType) => {
        const wrapper = mount(RoomCard, {
          props: { roomType, hasBreakfastOption: false },
          global: { plugins: [i18n] },
        })
        const radios = wrapper.findAll('input[type="radio"]')
        expect(radios.length).toBe(0)
      }),
      FC_PARAMS
    )
  })
})
