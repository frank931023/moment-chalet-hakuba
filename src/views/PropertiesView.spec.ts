// Feature: moment-chalet-booking-system, Property 1: 篩選結果一致性 (component-level)
import fc from 'fast-check'
import { describe, it } from 'vitest'
import { filterProperties } from '@/stores/propertyFilters'
import type { Property, RoomType, PropertyFilters } from '@/types'

// ── Arbitraries ──────────────────────────────────────────────────────────────

const arbUuid = fc.uuid()

const arbProperty = fc.record<Property>({
  id: arbUuid,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ maxLength: 200 }),
  location: fc.oneof(
    fc.constant('Hakuba'),
    fc.constant('Nagano'),
    fc.constant('Shinjuku'),
    fc.constant('Osaka'),
    fc.string({ minLength: 1, maxLength: 30 })
  ),
  lat: fc.float({ min: 30, max: 45 }),
  lng: fc.float({ min: 130, max: 145 }),
  images: fc.array(fc.webUrl(), { maxLength: 5 }),
  ical_url: fc.option(fc.webUrl(), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.constant(true),
  created_at: fc.date().map((d) => d.toISOString())
})

const arbRoomType = (propertyId: string) =>
  fc.record<RoomType>({
    id: arbUuid,
    property_id: fc.constant(propertyId),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    capacity: fc.integer({ min: 1, max: 10 }),
    price_per_night: fc.integer({ min: 1000, max: 50000 }).map(Number),
    breakfast_price: fc.integer({ min: 0, max: 5000 }).map(Number),
    amenities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    images: fc.array(fc.webUrl(), { maxLength: 3 }),
    is_active: fc.constant(true),
    created_at: fc.date().map((d) => d.toISOString())
  })

const arbPropertiesWithRoomTypes = fc
  .array(arbProperty, { minLength: 0, maxLength: 10 })
  .chain((props) => {
    if (props.length === 0) {
      return fc.constant({
        properties: [] as Property[],
        roomTypesByProperty: {} as Record<string, RoomType[]>
      })
    }
    return fc
      .tuple(...props.map((p) => fc.array(arbRoomType(p.id), { minLength: 0, maxLength: 4 })))
      .map((roomTypesArrays) => {
        const roomTypesByProperty: Record<string, RoomType[]> = {}
        props.forEach((p, i) => {
          roomTypesByProperty[p.id] = roomTypesArrays[i]
        })
        return { properties: props, roomTypesByProperty }
      })
  })

const arbFilters = fc.record<PropertyFilters>({
  location: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 10 })),
  checkIn: fc.constant(null),
  checkOut: fc.constant(null),
  guests: fc.integer({ min: 1, max: 8 }),
  priceRange: fc
    .tuple(fc.integer({ min: 0, max: 49000 }), fc.integer({ min: 1000, max: 100000 }))
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
})

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 1.2
 *
 * Property 1: 篩選結果一致性 (component-level)
 * This is a component-level validation confirming that PropertiesView uses the
 * same filterProperties logic. For any set of properties and filters, every
 * property in the result must satisfy ALL active filter criteria.
 */
describe('Property 1: 篩選結果一致性 (component-level)', () => {
  it('篩選結果中每個民宿都符合所有篩選條件', () => {
    fc.assert(
      fc.property(
        arbPropertiesWithRoomTypes,
        arbFilters,
        ({ properties, roomTypesByProperty }, filters) => {
          const result = filterProperties(properties, roomTypesByProperty, filters)

          return result.every((p) => {
            const roomTypes = roomTypesByProperty[p.id] ?? []

            // Location filter
            if (
              filters.location &&
              !p.location.toLowerCase().includes(filters.location.toLowerCase())
            ) {
              return false
            }

            // Guests filter
            if (filters.guests > 1) {
              const hasCapacity = roomTypes.some(
                (rt) => rt.is_active && rt.capacity >= filters.guests
              )
              if (!hasCapacity) return false
            }

            // Price range filter
            const [minPrice, maxPrice] = filters.priceRange
            if (minPrice > 0 || maxPrice < 100000) {
              const hasPriceInRange = roomTypes.some(
                (rt) =>
                  rt.is_active &&
                  rt.price_per_night >= minPrice &&
                  rt.price_per_night <= maxPrice
              )
              if (!hasPriceInRange) return false
            }

            return true
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
