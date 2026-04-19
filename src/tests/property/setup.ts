// Feature: moment-chalet-booking-system
// Global property test infrastructure — shared arbitraries and fast-check configuration

import fc from 'fast-check'
import type { Property, RoomType, Booking, BlockedDate, BookingStatus } from '@/types'

// ── Global fast-check parameters ────────────────────────────────────────────
export const FC_PARAMS: fc.Parameters<unknown> = { numRuns: 100 }

// ── Locale ───────────────────────────────────────────────────────────────────
export const arbLocale: fc.Arbitrary<'zh-TW' | 'en' | 'ja'> = fc.constantFrom(
  'zh-TW',
  'en',
  'ja'
)

// ── BookingStatus ─────────────────────────────────────────────────────────────
export const arbBookingStatus: fc.Arbitrary<BookingStatus> = fc.constantFrom(
  'pending',
  'confirmed',
  'cancelled',
  'refunded'
)

// ── Non-blank string ──────────────────────────────────────────────────────────
export const arbNonBlankString: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0)

// ── ISO date string (YYYY-MM-DD) ──────────────────────────────────────────────
const arbIsoDate: fc.Arbitrary<string> = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
  .map((d) => d.toISOString().slice(0, 10))

// ── Property ──────────────────────────────────────────────────────────────────
export const arbProperty: fc.Arbitrary<Property> = fc.record<Property>({
  id: fc.uuid(),
  name: arbNonBlankString,
  description: arbNonBlankString,
  location: arbNonBlankString,
  lat: fc.float({ min: 36.0, max: 37.0, noNaN: true }),
  lng: fc.float({ min: 137.0, max: 138.0, noNaN: true }),
  images: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
  ical_url: fc.option(fc.webUrl(), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.boolean(),
  created_at: arbIsoDate,
})

// ── RoomType ──────────────────────────────────────────────────────────────────
export const arbRoomType: fc.Arbitrary<RoomType> = fc.record<RoomType>({
  id: fc.uuid(),
  property_id: fc.uuid(),
  name: arbNonBlankString,
  capacity: fc.integer({ min: 1, max: 20 }),
  price_per_night: fc.float({ min: 1000, max: 50000, noNaN: true }),
  breakfast_price: fc.float({ min: 0, max: 5000, noNaN: true }),
  amenities: fc.array(arbNonBlankString, { minLength: 0, maxLength: 10 }),
  images: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
  is_active: fc.boolean(),
  created_at: arbIsoDate,
})

// ── Booking ───────────────────────────────────────────────────────────────────
export const arbBooking: fc.Arbitrary<Booking> = fc
  .tuple(arbIsoDate, fc.integer({ min: 1, max: 30 }))
  .chain(([checkIn, nights]) => {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setDate(checkOutDate.getDate() + nights)
    const checkOut = checkOutDate.toISOString().slice(0, 10)

    return fc.record<Booking>({
      id: fc.uuid(),
      room_type_id: fc.uuid(),
      guest_name: arbNonBlankString,
      guest_email: fc.emailAddress(),
      guest_phone: fc.string({ minLength: 7, maxLength: 15 }).filter((s) => /^\+?[\d\s-]+$/.test(s)),
      check_in: fc.constant(checkIn),
      check_out: fc.constant(checkOut),
      include_breakfast: fc.boolean(),
      total_amount: fc.float({ min: 1000, max: 2000000, noNaN: true }),
      status: arbBookingStatus,
      paypal_order_id: fc.option(arbNonBlankString, { nil: null }),
      paypal_capture_id: fc.option(arbNonBlankString, { nil: null }),
      special_requests: fc.option(arbNonBlankString, { nil: null }),
      created_at: arbIsoDate,
    })
  })

// ── BlockedDate ───────────────────────────────────────────────────────────────
export const arbBlockedDate: fc.Arbitrary<BlockedDate> = fc
  .tuple(arbIsoDate, fc.integer({ min: 1, max: 30 }))
  .chain(([startDate, nights]) => {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + nights)
    const endDate = end.toISOString().slice(0, 10)

    return fc.record<BlockedDate>({
      id: fc.uuid(),
      property_id: fc.uuid(),
      start_date: fc.constant(startDate),
      end_date: fc.constant(endDate),
      source: fc.constantFrom('ical', 'manual'),
      synced_at: arbIsoDate,
    })
  })
