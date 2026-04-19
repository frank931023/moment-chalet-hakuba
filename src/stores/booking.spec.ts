// Feature: moment-chalet-booking-system, Property 5: 含早餐金額計算正確性
import fc from 'fast-check'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { calculateBookingTotal, useBookingStore } from './booking'
import type { RoomType, Property } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

const mockRoomType: RoomType = {
  id: 'rt-1',
  property_id: 'p-1',
  name: 'Standard Room',
  capacity: 2,
  price_per_night: 5000,
  breakfast_price: 1000,
  amenities: [],
  images: [],
  is_active: true,
  created_at: new Date().toISOString(),
}

const mockProperty: Property = {
  id: 'p-1',
  name: 'Test Chalet',
  description: '',
  location: 'Hakuba',
  lat: 36.7,
  lng: 137.8,
  images: [],
  ical_url: null,
  has_breakfast_option: true,
  is_active: true,
  created_at: new Date().toISOString(),
}

// ── Unit tests: calculateBookingTotal ─────────────────────────────────────────

describe('calculateBookingTotal', () => {
  it('calculates total without breakfast', () => {
    const total = calculateBookingTotal({
      pricePerNight: 5000,
      breakfastPrice: 1000,
      checkIn: makeDate(2025, 1, 10),
      checkOut: makeDate(2025, 1, 13),
      includeBreakfast: false,
    })
    expect(total).toBe(15000) // 5000 × 3 nights
  })

  it('calculates total with breakfast', () => {
    const total = calculateBookingTotal({
      pricePerNight: 5000,
      breakfastPrice: 1000,
      checkIn: makeDate(2025, 1, 10),
      checkOut: makeDate(2025, 1, 13),
      includeBreakfast: true,
    })
    expect(total).toBe(18000) // (5000 + 1000) × 3 nights
  })

  it('returns 0 when checkOut equals checkIn', () => {
    const total = calculateBookingTotal({
      pricePerNight: 5000,
      breakfastPrice: 1000,
      checkIn: makeDate(2025, 1, 10),
      checkOut: makeDate(2025, 1, 10),
      includeBreakfast: false,
    })
    expect(total).toBe(0)
  })

  it('returns 0 when checkOut is before checkIn', () => {
    const total = calculateBookingTotal({
      pricePerNight: 5000,
      breakfastPrice: 1000,
      checkIn: makeDate(2025, 1, 13),
      checkOut: makeDate(2025, 1, 10),
      includeBreakfast: false,
    })
    expect(total).toBe(0)
  })

  it('handles 1-night stay', () => {
    const total = calculateBookingTotal({
      pricePerNight: 8000,
      breakfastPrice: 500,
      checkIn: makeDate(2025, 3, 1),
      checkOut: makeDate(2025, 3, 2),
      includeBreakfast: true,
    })
    expect(total).toBe(8500)
  })
})

// ── Unit tests: useBookingStore ───────────────────────────────────────────────

describe('useBookingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initialises with default state', () => {
    const store = useBookingStore()
    expect(store.step).toBe(1)
    expect(store.selectedProperty).toBeNull()
    expect(store.selectedRoomType).toBeNull()
    expect(store.checkIn).toBeNull()
    expect(store.checkOut).toBeNull()
    expect(store.includeBreakfast).toBe(false)
    expect(store.guestName).toBe('')
    expect(store.guestEmail).toBe('')
    expect(store.guestPhone).toBe('')
    expect(store.specialRequests).toBe('')
    expect(store.totalAmount).toBe(0)
  })

  it('setStep updates step', () => {
    const store = useBookingStore()
    store.setStep(2)
    expect(store.step).toBe(2)
    store.setStep(3)
    expect(store.step).toBe(3)
  })

  it('reset restores all defaults', () => {
    const store = useBookingStore()
    store.setStep(3)
    store.guestName = 'Alice'
    store.guestEmail = 'alice@example.com'
    store.guestPhone = '0912345678'
    store.selectedRoomType = mockRoomType
    store.checkIn = makeDate(2025, 2, 1)
    store.checkOut = makeDate(2025, 2, 5)
    store.includeBreakfast = true
    store.calculateTotal()

    store.reset()

    expect(store.step).toBe(1)
    expect(store.guestName).toBe('')
    expect(store.guestEmail).toBe('')
    expect(store.guestPhone).toBe('')
    expect(store.selectedRoomType).toBeNull()
    expect(store.checkIn).toBeNull()
    expect(store.checkOut).toBeNull()
    expect(store.includeBreakfast).toBe(false)
    expect(store.totalAmount).toBe(0)
  })

  it('calculateTotal updates totalAmount and returns correct value', () => {
    const store = useBookingStore()
    store.selectedRoomType = mockRoomType
    store.checkIn = makeDate(2025, 2, 1)
    store.checkOut = makeDate(2025, 2, 4) // 3 nights
    store.includeBreakfast = false

    const result = store.calculateTotal()
    expect(result).toBe(15000)
    expect(store.totalAmount).toBe(15000)
  })

  it('calculateTotal with breakfast updates totalAmount', () => {
    const store = useBookingStore()
    store.selectedRoomType = mockRoomType
    store.checkIn = makeDate(2025, 2, 1)
    store.checkOut = makeDate(2025, 2, 4) // 3 nights
    store.includeBreakfast = true

    const result = store.calculateTotal()
    expect(result).toBe(18000) // (5000 + 1000) × 3
    expect(store.totalAmount).toBe(18000)
  })

  it('calculateTotal returns 0 when no room type selected', () => {
    const store = useBookingStore()
    store.checkIn = makeDate(2025, 2, 1)
    store.checkOut = makeDate(2025, 2, 4)
    const result = store.calculateTotal()
    expect(result).toBe(0)
    expect(store.totalAmount).toBe(0)
  })

  // isStep1Complete
  it('isStep1Complete is false when dates or room type missing', () => {
    const store = useBookingStore()
    expect(store.isStep1Complete).toBe(false)

    store.checkIn = makeDate(2025, 2, 1)
    expect(store.isStep1Complete).toBe(false)

    store.checkOut = makeDate(2025, 2, 5)
    expect(store.isStep1Complete).toBe(false) // still no room type

    store.selectedRoomType = mockRoomType
    expect(store.isStep1Complete).toBe(true)
  })

  it('isStep1Complete is false when checkOut <= checkIn', () => {
    const store = useBookingStore()
    store.selectedRoomType = mockRoomType
    store.checkIn = makeDate(2025, 2, 5)
    store.checkOut = makeDate(2025, 2, 3) // before checkIn
    expect(store.isStep1Complete).toBe(false)

    store.checkOut = makeDate(2025, 2, 5) // equal to checkIn
    expect(store.isStep1Complete).toBe(false)
  })

  // isStep2Complete
  it('isStep2Complete is false when any guest field is empty', () => {
    const store = useBookingStore()
    expect(store.isStep2Complete).toBe(false)

    store.guestName = 'Alice'
    expect(store.isStep2Complete).toBe(false)

    store.guestEmail = 'alice@example.com'
    expect(store.isStep2Complete).toBe(false)

    store.guestPhone = '0912345678'
    expect(store.isStep2Complete).toBe(true)
  })

  it('isStep2Complete is false for whitespace-only fields', () => {
    const store = useBookingStore()
    store.guestName = '   '
    store.guestEmail = '   '
    store.guestPhone = '   '
    expect(store.isStep2Complete).toBe(false)
  })
})

// ── Property 5: 含早餐金額計算正確性 ─────────────────────────────────────────

/**
 * Validates: Requirements 2.3
 *
 * Property 5: 含早餐金額計算正確性
 * For any pricePerNight (P), breakfastPrice (B), nights (N), and includeBreakfast:
 *   - without breakfast: total = P × N
 *   - with breakfast:    total = (P + B) × N
 */
describe('Property 5: 含早餐金額計算正確性', () => {
  it('不含早餐：total = pricePerNight × nights', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50000 }),  // pricePerNight
        fc.integer({ min: 0, max: 5000 }),       // breakfastPrice
        fc.integer({ min: 1, max: 30 }),         // nights
        (pricePerNight, breakfastPrice, nights) => {
          const checkIn = new Date(2025, 0, 1)
          const checkOut = new Date(2025, 0, 1 + nights)
          const total = calculateBookingTotal({
            pricePerNight,
            breakfastPrice,
            checkIn,
            checkOut,
            includeBreakfast: false,
          })
          return total === pricePerNight * nights
        }
      ),
      { numRuns: 100 }
    )
  })

  it('含早餐：total = (pricePerNight + breakfastPrice) × nights', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50000 }),  // pricePerNight
        fc.integer({ min: 0, max: 5000 }),       // breakfastPrice
        fc.integer({ min: 1, max: 30 }),         // nights
        (pricePerNight, breakfastPrice, nights) => {
          const checkIn = new Date(2025, 0, 1)
          const checkOut = new Date(2025, 0, 1 + nights)
          const total = calculateBookingTotal({
            pricePerNight,
            breakfastPrice,
            checkIn,
            checkOut,
            includeBreakfast: true,
          })
          return total === (pricePerNight + breakfastPrice) * nights
        }
      ),
      { numRuns: 100 }
    )
  })

  it('nights = 0 時 total 恆為 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50000 }),
        fc.integer({ min: 0, max: 5000 }),
        fc.boolean(),
        (pricePerNight, breakfastPrice, includeBreakfast) => {
          const checkIn = new Date(2025, 0, 5)
          const checkOut = new Date(2025, 0, 5) // same day = 0 nights
          const total = calculateBookingTotal({
            pricePerNight,
            breakfastPrice,
            checkIn,
            checkOut,
            includeBreakfast,
          })
          return total === 0
        }
      ),
      { numRuns: 100 }
    )
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
      fc.property(
        fc.integer({ min: 1, max: 28 }),   // checkIn day
        fc.integer({ min: 1, max: 27 }),   // nights (1..27)
        (day, nights) => {
          const store = useBookingStore()
          store.checkIn = new Date(2025, 0, day)
          store.checkOut = new Date(2025, 0, day + nights)
          store.selectedRoomType = mockRoomType
          return store.isStep1Complete === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('缺少 selectedRoomType 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 1, max: 27 }),
        (day, nights) => {
          const store = useBookingStore()
          store.checkIn = new Date(2025, 0, day)
          store.checkOut = new Date(2025, 0, day + nights)
          store.selectedRoomType = null
          return store.isStep1Complete === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('checkOut <= checkIn 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 28 }),   // checkIn day (min 2 so we can go before it)
        fc.integer({ min: 0, max: 5 }),    // offset (0 = same day, positive = before checkIn)
        (day, offset) => {
          const store = useBookingStore()
          store.checkIn = new Date(2025, 0, day)
          store.checkOut = new Date(2025, 0, day - offset) // checkOut <= checkIn
          store.selectedRoomType = mockRoomType
          return store.isStep1Complete === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('缺少 checkIn 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),
        (day) => {
          const store = useBookingStore()
          store.checkIn = null
          store.checkOut = new Date(2025, 0, day)
          store.selectedRoomType = mockRoomType
          return store.isStep1Complete === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('缺少 checkOut 時 isStep1Complete 為 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),
        (day) => {
          const store = useBookingStore()
          store.checkIn = new Date(2025, 0, day)
          store.checkOut = null
          store.selectedRoomType = mockRoomType
          return store.isStep1Complete === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
