// Feature: moment-chalet-booking-system, Property 2: 民宿詳情頁完整性
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import type { Property, RoomType } from '@/types'

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Validates that a property has all required fields for display on the detail page:
 * - name (non-empty)
 * - location (non-empty)
 * - description (non-empty)
 * - at least one image
 */
function validatePropertyDetailData(property: Property, _roomTypes: RoomType[]): boolean {
  if (!property.name || property.name.trim() === '') return false
  if (!property.location || property.location.trim() === '') return false
  if (!property.description || property.description.trim() === '') return false
  if (!property.images || property.images.length === 0) return false
  return true
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbUuid = fc.uuid()

const nonBlankString = (minLength = 1, maxLength = 50) =>
  fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0)

const arbValidProperty = fc.record<Property>({
  id: arbUuid,
  name: nonBlankString(1, 50),
  description: nonBlankString(1, 500),
  location: nonBlankString(1, 100),
  lat: fc.float({ min: 30, max: 45 }),
  lng: fc.float({ min: 130, max: 145 }),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
  ical_url: fc.option(fc.webUrl(), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.boolean(),
  created_at: fc.date().map((d) => d.toISOString())
})

const arbRoomType = fc.record<RoomType>({
  id: arbUuid,
  property_id: arbUuid,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  capacity: fc.integer({ min: 1, max: 10 }),
  price_per_night: fc.integer({ min: 1000, max: 50000 }).map(Number),
  breakfast_price: fc.integer({ min: 0, max: 5000 }).map(Number),
  amenities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  images: fc.array(fc.webUrl(), { maxLength: 3 }),
  is_active: fc.boolean(),
  created_at: fc.date().map((d) => d.toISOString())
})

const arbRoomTypes = fc.array(arbRoomType, { minLength: 0, maxLength: 5 })

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 1.5
 *
 * Property 2: 民宿詳情頁完整性
 * For any valid Property data, the detail page data validation should confirm
 * that all required fields (name, location, description, at least one image)
 * are present and non-empty.
 */
describe('Property 2: 民宿詳情頁完整性', () => {
  it('有效民宿資料應通過詳情頁完整性驗證', () => {
    fc.assert(
      fc.property(arbValidProperty, arbRoomTypes, (property, roomTypes) => {
        return validatePropertyDetailData(property, roomTypes) === true
      }),
      { numRuns: 100 }
    )
  })

  it('缺少必要欄位的民宿資料應驗證失敗', () => {
    // Missing name
    expect(
      validatePropertyDetailData(
        { id: '1', name: '', description: 'desc', location: 'Hakuba', lat: 36, lng: 137, images: ['img.jpg'], ical_url: null, has_breakfast_option: false, is_active: true, created_at: '' },
        []
      )
    ).toBe(false)

    // Missing description
    expect(
      validatePropertyDetailData(
        { id: '1', name: 'Chalet', description: '', location: 'Hakuba', lat: 36, lng: 137, images: ['img.jpg'], ical_url: null, has_breakfast_option: false, is_active: true, created_at: '' },
        []
      )
    ).toBe(false)

    // Missing location
    expect(
      validatePropertyDetailData(
        { id: '1', name: 'Chalet', description: 'desc', location: '', lat: 36, lng: 137, images: ['img.jpg'], ical_url: null, has_breakfast_option: false, is_active: true, created_at: '' },
        []
      )
    ).toBe(false)

    // No images
    expect(
      validatePropertyDetailData(
        { id: '1', name: 'Chalet', description: 'desc', location: 'Hakuba', lat: 36, lng: 137, images: [], ical_url: null, has_breakfast_option: false, is_active: true, created_at: '' },
        []
      )
    ).toBe(false)
  })
})
